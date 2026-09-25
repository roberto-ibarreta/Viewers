import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router';

import { Header } from '@ohif/ui-next';
import { Toolbar } from '../Toolbar/Toolbar';
import HeaderPatientInfo from './HeaderPatientInfo';
import { PatientInfoVisibility } from './HeaderPatientInfo/HeaderPatientInfo';

function ViewerHeader({
  extensionManager,
  servicesManager,
  appConfig,
}: withAppTypes<{ appConfig: AppTypes.Config }>) {
  const navigate = useNavigate();
  const location = useLocation();

  const onClickReturnButton = () => {
    const { pathname } = location;
    const dataSourceIdx = pathname.indexOf('/', 1);
    const query = new URLSearchParams(window.location.search);
    const configUrl = query.get('configUrl');

    const dataSourceName = pathname.substring(dataSourceIdx + 1);
    const existingDataSource = extensionManager.getDataSources(dataSourceName);

    const searchQuery = new URLSearchParams();
    if (dataSourceIdx !== -1 && existingDataSource) {
      searchQuery.append('datasources', pathname.substring(dataSourceIdx + 1));
    }

    if (configUrl) {
      searchQuery.append('configUrl', configUrl);
    }

    navigate({
      pathname: '/',
      search: decodeURIComponent(searchQuery.toString()),
    });
  };

  return (
    <Header
      menuOptions={[]}
      isReturnEnabled={!!appConfig.showStudyList}
      onClickReturnButton={onClickReturnButton}
      WhiteLabeling={appConfig.whiteLabeling}
      Secondary={
        <Toolbar
          servicesManager={servicesManager}
          buttonSection="secondary"
        />
      }
      PatientInfo={
        appConfig.showPatientInfo !== PatientInfoVisibility.DISABLED && (
          <HeaderPatientInfo
            servicesManager={servicesManager}
            appConfig={appConfig}
          />
        )
      }
    >
      <Toolbar servicesManager={servicesManager} />
    </Header>
  );
}

export default ViewerHeader;
