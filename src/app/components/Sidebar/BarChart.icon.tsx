import React from 'react';

type IconProps = {
  fillColor?: string;
};

const BarChartIcon: React.FC<IconProps> = ({ fillColor = '#495D68' }) => (
  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_6003_601)">
      <g clipPath="url(#clip1_6003_601)">
        <path opacity="0.3" d="M5 6V20H19V6H5ZM14 18H7V16H14V18ZM17 14H7V12H17V14ZM17 10H7V8H17V10Z" fill={fillColor} />
        <path
          d="M19 4H5C3.9 4 3 4.9 3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V6H19V20ZM17 14H7V12H17V14ZM17 10H7V8H17V10ZM14 18H7V16H14V18Z"
          fill={fillColor}
        />
      </g>
    </g>
    <defs>
      <clipPath id="clip0_6003_601">
        <rect width="24" height="24" fill="white" transform="translate(0 0.5)" />
      </clipPath>
      <clipPath id="clip1_6003_601">
        <rect width="24" height="24" fill="white" transform="translate(0 1)" />
      </clipPath>
    </defs>
  </svg>
);

export default BarChartIcon;
