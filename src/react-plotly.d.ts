declare module 'react-plotly.js' {
  import React from 'react';

  interface PlotData {
    x?: (string | number)[];
    y?: (string | number)[];
    z?: (string | number)[][];
    type?: string;
    mode?: string;
    name?: string;
    line?: {
      color?: string;
      width?: number;
      dash?: string;
    };
    marker?: {
      size?: number | number[];
      color?: string | string[];
      opacity?: number;
      symbol?: string;
    };
    [key: string]: any;
  }

  interface Layout {
    title?: string;
    xaxis?: {
      title?: string;
      type?: string;
      [key: string]: any;
    };
    yaxis?: {
      title?: string;
      type?: string;
      [key: string]: any;
    };
    hovermode?: string;
    margin?: {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    [key: string]: any;
  }

  interface PlotProps {
    data: PlotData[];
    layout?: Layout;
    style?: React.CSSProperties;
    config?: any;
    onInitialized?: (figure: any, graphDiv: HTMLDivElement) => void;
    onUpdate?: (figure: any, graphDiv: HTMLDivElement) => void;
    onPurge?: (figure: any, graphDiv: HTMLDivElement) => void;
    onError?: (error: any) => void;
    onClick?: (data: any) => void;
    onHover?: (data: any) => void;
    onUnhover?: (data: any) => void;
    onRelayout?: (data: any) => void;
    onRestyle?: (data: any) => void;
    onLegendClick?: (data: any) => boolean;
    onLegendDoubleClick?: (data: any) => boolean;
    onAutoSize?: (data: any) => void;
    onBeforeHover?: (data: any) => boolean;
    onSliderChange?: (data: any) => void;
    onSliderEnd?: (data: any) => void;
    onSliderStart?: (data: any) => void;
    useResizeHandler?: boolean;
    debug?: boolean;
    className?: string;
    divId?: string;
  }

  const Plot: React.FC<PlotProps>;
  export default Plot;
}
