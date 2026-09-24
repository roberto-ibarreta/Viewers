import React, { ReactNode } from 'react';
import classNames from 'classnames';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Icons,
  Button,
} from '../';

import NavBar from '../NavBar';

// Todo: we should move this component to composition and remove props base

interface HeaderProps {
  children?: ReactNode;
  menuOptions: Array<{
    title: string;
    icon?: string;
    onClick: () => void;
  }>;
  isReturnEnabled?: boolean;
  onClickReturnButton?: () => void;
  isSticky?: boolean;
  WhiteLabeling?: {
    createLogoComponentFn?: (React: any, props: any) => ReactNode;
  };
  PatientInfo?: ReactNode;
  Secondary?: ReactNode;
}

function Header({
  children,
  menuOptions,
  isReturnEnabled = true,
  onClickReturnButton,
  isSticky = false,
  WhiteLabeling,
  PatientInfo,
  Secondary,
  ...props
}: HeaderProps): ReactNode {
  const onClickReturn = () => {
    if (isReturnEnabled && onClickReturnButton) {
      onClickReturnButton();
    }
  };

  return (
    <NavBar
      isSticky={isSticky}
      {...props}
    >
      <div className="flex flex-col gap-1 px-1 py-1 md:h-[48px] md:flex-row md:items-center md:gap-2 md:py-0">
        {/* Chrome row: back/logo + patient/settings */}
        <div className="flex shrink-0 items-center justify-between gap-1 md:contents">
          <div className="flex shrink-0 items-center">
            <div
              className={classNames(
                'inline-flex items-center',
                isReturnEnabled && 'cursor-pointer'
              )}
              onClick={onClickReturn}
              data-cy="return-to-work-list"
            >
              {isReturnEnabled && <Icons.ChevronPatient className="text-primary-active w-8" />}
              <div className="ml-1 hidden max-w-[140px] truncate sm:block md:block">
                {WhiteLabeling?.createLogoComponentFn?.(React, props) || <Icons.OHIFLogo />}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 select-none items-center md:order-last">
            {PatientInfo ? (
              <div className="max-w-[120px] truncate sm:max-w-none">{PatientInfo}</div>
            ) : null}
            <div className="border-primary-dark mx-1.5 h-[25px] border-r"></div>
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary-active hover:bg-primary-dark mt-2 h-full w-full"
                  >
                    <Icons.GearSettings />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuOptions.map((option, index) => {
                    const IconComponent = option.icon
                      ? Icons[option.icon as keyof typeof Icons]
                      : null;
                    return (
                      <DropdownMenuItem
                        key={index}
                        onSelect={option.onClick}
                        className="flex items-center gap-2 py-2"
                      >
                        {IconComponent && (
                          <span className="flex h-4 w-4 items-center justify-center">
                            <IconComponent className="h-full w-full" />
                          </span>
                        )}
                        <span className="flex-1">{option.title}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Tools: Toolbar balances into equal rows on mobile */}
        <div className="min-w-0 max-h-[132px] flex-1 overflow-y-auto md:max-h-none md:overflow-visible">
          <div className="flex flex-col items-stretch gap-1 md:flex-row md:flex-wrap md:items-center md:justify-center">
            {Secondary}
            {children}
          </div>
        </div>
      </div>
    </NavBar>
  );
}

export default Header;
