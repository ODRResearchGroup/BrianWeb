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
    [key: string]: unknown;
  }

  interface Layout {
    title?: string;
    xaxis?: {
      title?: string;
      type?: string;
      [key: string]: unknown;
    };
    yaxis?: {
      title?: string;
      type?: string;
      [key: string]: unknown;
    };
    hovermode?: string;
    margin?: {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    [key: string]: unknown;
  }

  interface PlotProps {
    data: PlotData[];
    layout?: Layout;
    style?: React.CSSProperties;
    config?: unknown;
    onInitialized?: (figure: unknown, graphDiv: HTMLDivElement) => void;
    onUpdate?: (figure: unknown, graphDiv: HTMLDivElement) => void;
    onPurge?: (figure: unknown, graphDiv: HTMLDivElement) => void;
    onError?: (error: unknown) => void;
    onClick?: (data: unknown) => void;
    onHover?: (data: unknown) => void;
    onUnhover?: (data: unknown) => void;
    onRelayout?: (data: unknown) => void;
    onRestyle?: (data: unknown) => void;
    onLegendClick?: (data: unknown) => boolean;
    onLegendDoubleClick?: (data: unknown) => boolean;
    onAutoSize?: (data: unknown) => void;
    onBeforeHover?: (data: unknown) => boolean;
    onSliderChange?: (data: unknown) => void;
    onSliderEnd?: (data: unknown) => void;
    onSliderStart?: (data: unknown) => void;
    useResizeHandler?: boolean;
    debug?: boolean;
    className?: string;
    divId?: string;
  }

  const Plot: React.FC<PlotProps>;
  export default Plot;
}
