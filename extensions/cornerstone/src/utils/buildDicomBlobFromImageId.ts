import { imageLoader, metaData } from '@cornerstonejs/core';
import dcmjs from 'dcmjs';

const { DicomMetaDictionary, DicomDict } = dcmjs.data;
const { denaturalizeDataset } = DicomMetaDictionary;

const EXPLICIT_VR_LITTLE_ENDIAN = '1.2.840.10008.1.2.1';
const ImplementationClassUID = '2.25.270695996825855179949881587723571202391.2.0.0';
const ImplementationVersionName = 'OHIF-VIEWER-2.0.0';

/**
 * Only copy known-safe DICOM keywords. Naturalized OHIF instances also contain
 * runtime fields and malformed values that break dcmjs write (e.g. CS as object).
 */
const TAGS_TO_COPY = [
  'SOPClassUID',
  'SOPInstanceUID',
  'StudyInstanceUID',
  'SeriesInstanceUID',
  'StudyID',
  'PatientName',
  'PatientID',
  'PatientBirthDate',
  'PatientSex',
  'PatientAge',
  'StudyDate',
  'StudyTime',
  'StudyDescription',
  'AccessionNumber',
  'ReferringPhysicianName',
  'Modality',
  'SeriesNumber',
  'SeriesDescription',
  'SeriesDate',
  'SeriesTime',
  'InstanceNumber',
  'ContentDate',
  'ContentTime',
  'ImageType',
  'AcquisitionNumber',
  'Rows',
  'Columns',
  'BitsAllocated',
  'BitsStored',
  'HighBit',
  'PixelRepresentation',
  'SamplesPerPixel',
  'PhotometricInterpretation',
  'PlanarConfiguration',
  'PixelSpacing',
  'ImagerPixelSpacing',
  'SliceThickness',
  'SpacingBetweenSlices',
  'ImagePositionPatient',
  'ImageOrientationPatient',
  'SliceLocation',
  'FrameOfReferenceUID',
  'PositionReferenceIndicator',
  'WindowCenter',
  'WindowWidth',
  'RescaleIntercept',
  'RescaleSlope',
  'RescaleType',
  'PresentationLUTShape',
  'VOILUTFunction',
  'Laterality',
  'ImageLaterality',
  'ViewPosition',
  'Manufacturer',
  'ManufacturerModelName',
  'StationName',
  'InstitutionName',
  'BodyPartExamined',
  'SpecificCharacterSet',
];

function isPersonName(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    ('Alphabetic' in (value as object) ||
      'Ideographic' in (value as object) ||
      'Phonetic' in (value as object))
  );
}

function isBulkDataRef(value: unknown): boolean {
  return (
    !!value &&
    typeof value === 'object' &&
    ('BulkDataURI' in (value as object) || 'retrieveBulkData' in (value as object))
  );
}

/**
 * Coerce naturalized values into forms dcmjs can write.
 * Drops unexpected objects that would become "[object Object]" for CS/SH/LO/etc.
 */
function sanitizeValue(value: unknown): unknown {
  if (value == null) {
    return undefined;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (ArrayBuffer.isView(value) || value instanceof ArrayBuffer) {
    return value;
  }

  if (isPersonName(value) || isBulkDataRef(value)) {
    return isBulkDataRef(value) ? undefined : value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return undefined;
    }

    // Sequence of DICOM items
    if (value.every(item => item && typeof item === 'object' && !Array.isArray(item))) {
      if (value.some(isPersonName)) {
        return value;
      }

      return value
        .map(item => {
          const cleaned: Record<string, unknown> = {};
          Object.entries(item as Record<string, unknown>).forEach(([key, nested]) => {
            const sanitized = sanitizeValue(nested);
            if (sanitized !== undefined) {
              cleaned[key] = sanitized;
            }
          });
          return Object.keys(cleaned).length ? cleaned : undefined;
        })
        .filter(Boolean);
    }

    // Multi-value primitives (e.g. ImageType)
    const primitives = value
      .map(item => {
        if (typeof item === 'string' || typeof item === 'number') {
          return item;
        }
        return undefined;
      })
      .filter(item => item !== undefined);

    return primitives.length ? primitives : undefined;
  }

  // Unexpected object for a scalar VR — skip rather than stringify to "[object Object]"
  return undefined;
}

function pickSanitizedDataset(instance: Record<string, unknown>): Record<string, unknown> {
  const dataset: Record<string, unknown> = {};

  TAGS_TO_COPY.forEach(tag => {
    if (!(tag in instance)) {
      return;
    }

    const sanitized = sanitizeValue(instance[tag]);
    if (sanitized !== undefined) {
      dataset[tag] = sanitized;
    }
  });

  // ImageType must be an array of CS strings for denaturalize/write
  if (typeof dataset.ImageType === 'string') {
    dataset.ImageType = (dataset.ImageType as string).split('\\');
  }

  return dataset;
}

/**
 * Static WADO / S3 deployments often do not publish full Part 10 instances
 * at /instances/{SOPInstanceUID}. Rebuild a usable DICOM file from the
 * naturalized metadata and the (decoded) pixel data already loaded by Cornerstone.
 */
export default async function buildDicomBlobFromImageId(imageId: string): Promise<Blob> {
  const instance = metaData.get('instance', imageId);

  if (!instance) {
    throw new Error('Unable to find DICOM metadata for the current image');
  }

  const image = await imageLoader.loadAndCacheImage(imageId);
  const pixelData = image.getPixelData();

  if (!pixelData) {
    throw new Error('Unable to read pixel data for the current image');
  }

  const pixelBuffer = pixelData.buffer.slice(
    pixelData.byteOffset,
    pixelData.byteOffset + pixelData.byteLength
  );

  const dataset = pickSanitizedDataset(instance);

  dataset.Rows = image.rows ?? dataset.Rows;
  dataset.Columns = image.columns ?? dataset.Columns;
  dataset.BitsAllocated =
    image.bitsAllocated ?? dataset.BitsAllocated ?? pixelData.BYTES_PER_ELEMENT * 8;
  dataset.BitsStored = image.bitsStored ?? dataset.BitsStored ?? dataset.BitsAllocated;
  dataset.HighBit = image.highBit ?? dataset.HighBit ?? (dataset.BitsStored as number) - 1;
  dataset.PixelRepresentation =
    image.pixelRepresentation ?? dataset.PixelRepresentation ?? 0;
  dataset.SamplesPerPixel = image.samplesPerPixel ?? dataset.SamplesPerPixel ?? 1;
  dataset.PhotometricInterpretation =
    image.photometricInterpretation ?? dataset.PhotometricInterpretation ?? 'MONOCHROME2';
  dataset.TransferSyntaxUID = EXPLICIT_VR_LITTLE_ENDIAN;
  dataset.PixelData = pixelBuffer;

  if (!dataset.SOPClassUID || !dataset.SOPInstanceUID) {
    throw new Error('Missing SOP Class/Instance UID required to write DICOM');
  }

  const fileMeta = {
    FileMetaInformationVersion: new Uint8Array([0, 1]).buffer,
    MediaStorageSOPClassUID: dataset.SOPClassUID,
    MediaStorageSOPInstanceUID: dataset.SOPInstanceUID,
    TransferSyntaxUID: EXPLICIT_VR_LITTLE_ENDIAN,
    ImplementationClassUID,
    ImplementationVersionName,
  };

  const dicomDict = new DicomDict(denaturalizeDataset(fileMeta));
  dicomDict.dict = denaturalizeDataset(dataset);

  const part10Buffer = dicomDict.write({ allowInvalidVRLength: true });
  return new Blob([part10Buffer], { type: 'application/dicom' });
}
