import React from 'react';

type IconProps = {
  fillColor?: string;
};

const LightModeIcon: React.FC<IconProps> = ({ fillColor = '#fff' }) => (
<svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 512 512" style={{ width: '24px', height: '24px', opacity: 1 }} >
<g>
	<ellipse fill={fillColor} cx="256" cy="256" rx="137.275" ry="137.28"></ellipse>
	<rect x="241.16" fill={fillColor} width="29.68" height="81.62"></rect>
	<rect x="241.16" y="430.38" fill={fillColor} width="29.68" height="81.62"></rect>
	<polygon fill={fillColor} points="181.665,97.56 140.855,26.88 115.15,41.72 155.96,112.41 	"></polygon>

		<rect x="322.784" y="427.522" transform="matrix(-0.5001 -0.866 0.866 -0.5001 162.3364 978.4368)" fill={fillColor} width="81.618" height="29.677"></rect>
	<polygon fill={fillColor} points="26.88,140.85 97.565,181.66 112.41,155.96 41.72,115.15 	"></polygon>
	<polygon fill={fillColor} points="399.594,356.04 470.285,396.85 485.125,371.15 414.435,330.34 	"></polygon>
	<rect y="241.16" fill={fillColor} width="81.625" height="29.68"></rect>
	<rect x="430.375" y="241.16" fill={fillColor} width="81.625" height="29.68"></rect>
	<polygon fill={fillColor} points="26.88,371.14 41.72,396.85 112.406,356.04 97.565,330.33 	"></polygon>
	<polygon fill={fillColor} points="485.125,140.85 470.285,115.15 399.594,155.96 414.435,181.66 	"></polygon>

		<rect x="133.566" y="401.543" transform="matrix(-0.866 -0.5 0.5 -0.866 55.7691 899.6527)" fill={fillColor} width="29.682" height="81.624"></rect>
	<polygon fill={fillColor} points="330.335,97.56 356.04,112.41 396.85,41.72 371.15,26.88 	"></polygon>
</g>
</svg>

);

export default LightModeIcon;
