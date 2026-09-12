import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Line,
  Polyline,
} from 'react-native-svg';

export interface IconProps {
  size?: number;
  color?: string;
  style?: any;
}

export const SunIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Circle cx={12} cy={12} r={4} />
    <Path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </Svg>
);

export const MoonIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
  </Svg>
);

export const MedicalCrossIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M12 5v14M5 12h14" />
  </Svg>
);

export const ScanIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <Line x1={7} y1={12} x2={17} y2={12} />
  </Svg>
);

export const FileTextIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <Path d="M14 2v4a2 2 0 0 0 2 2h4M10 9H8M16 13H8M16 17H8" />
  </Svg>
);

export const UploadCloudIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
    <Path d="M12 12v9M16 16l-4-4-4 4" />
  </Svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </Svg>
);

export const TrashIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />
  </Svg>
);

export const SearchIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Circle cx={11} cy={11} r={8} />
    <Path d="m21 21-4.3-4.3" />
  </Svg>
);

export const UserIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <Circle cx={12} cy={7} r={4} />
  </Svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M20 6 9 17l-5-5" />
  </Svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const PillIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
    <Path d="m8.5 8.5 7 7" />
  </Svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <Path d="m9 12 2 2 4-4" />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Circle cx={12} cy={12} r={10} />
    <Polyline points="12 6 12 12 16 14" />
  </Svg>
);

export const CalendarIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M8 2v4M16 2v4M3 10h18" />
    <Rect width={18} height={18} x={3} y={4} rx={2} />
  </Svg>
);

export const HeartPulseIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    <Path d="M3.22 12H9.5l1.5-3 2 6 1.5-3h6.28" />
  </Svg>
);

export const DoctorIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
    <Path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
    <Circle cx={20} cy={10} r={2} />
  </Svg>
);

export const ExternalLinkIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
  </Svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5" />
  </Svg>
);

export const InfoIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Circle cx={12} cy={12} r={10} />
    <Path d="M12 16v-4M12 8h.01" />
  </Svg>
);

export const QrCodeIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Rect width={5} height={5} x={3} y={3} rx={1} />
    <Rect width={5} height={5} x={16} y={3} rx={1} />
    <Rect width={5} height={5} x={3} y={16} rx={1} />
    <Path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1" />
  </Svg>
);

export const ShareIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Circle cx={18} cy={5} r={3} />
    <Circle cx={6} cy={12} r={3} />
    <Circle cx={18} cy={19} r={3} />
    <Line x1={8.59} y1={13.51} x2={15.42} y2={17.49} />
    <Line x1={15.41} y1={6.51} x2={8.59} y2={10.49} />
  </Svg>
);

export const PhoneIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </Svg>
);

export const AlertTriangleIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <Line x1={12} y1={9} x2={12} y2={13} />
    <Line x1={12} y1={17} x2={12.01} y2={17} />
  </Svg>
);

export const CopyIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Rect width={14} height={14} x={8} y={8} rx={2} ry={2} />
    <Path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </Svg>
);

export const ChevronLeftIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="m15 18-6-6 6-6" />
  </Svg>
);

export const ChevronRightIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="m9 18 6-6-6-6" />
  </Svg>
);

export const BarChartIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Line x1={12} y1={20} x2={12} y2={10} />
    <Line x1={18} y1={20} x2={18} y2={4} />
    <Line x1={6} y1={20} x2={6} y2={16} />
  </Svg>
);

export const DietIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
    <Path d="M12 6a6 6 0 0 0-6 6h12a6 6 0 0 0-6-6z" />
  </Svg>
);

export const SparklesIcon: React.FC<IconProps> = ({ size = 20, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    <Path d="M5 3v4M3 5h4M19 17v4M17 19h4" />
  </Svg>
);

export const SendIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Line x1={22} y1={2} x2={11} y2={13} />
    <Polyline points="22 2 15 22 11 13 2 9 22 2" />
  </Svg>
);

export const RefreshCwIcon: React.FC<IconProps> = ({ size = 18, color = 'currentColor', style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
    <Polyline points="23 4 23 10 17 10" />
    <Polyline points="1 20 1 14 7 14" />
    <Path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </Svg>
);


