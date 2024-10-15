import React from 'react';

type IconProps = {
  fillColor?: string;
};

const ArrowDownIcon: React.FC<IconProps> = ({ fillColor = '#495D68' }) => (
  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M17.5833 10.5832L12.5833 15.5832C12.4167 15.7498 12.25 15.8332 12 15.8332C11.75 15.8332 11.5833 15.7498 11.4167 15.5832L6.41666 10.5832C6.08332 10.2498 6.08332 9.74984 6.41666 9.4165C6.74999 9.08317 7.24999 9.08317 7.58332 9.4165L12 13.8332L16.4167 9.4165C16.75 9.08317 17.25 9.08317 17.5833 9.4165C17.9167 9.74984 17.9167 10.2498 17.5833 10.5832Z"
      fill={fillColor}
    />
  </svg>
);

export default ArrowDownIcon;
