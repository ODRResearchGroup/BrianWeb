declare module 'plotly.js-dist-min' {
  interface PlotData {
    x?: (string | number | Date)[];
    y?: (string | number)[];
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
    xaxis?: Record<string, any>;
    yaxis?: Record<string, any>;
    hovermode?: string;
    margin?: {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    [key: string]: any;
  }

  interface Config {
    responsive?: boolean;
    displayModeBar?: boolean;
    [key: string]: any;
  }

  interface Plotly {
    newPlot(
      div: HTMLElement | string,
      data: PlotData[],
      layout?: Layout,
      config?: Config
    ): Promise<HTMLElement>;
    react(
      div: HTMLElement | string,
      data: PlotData[],
      layout?: Layout,
      config?: Config
    ): Promise<HTMLElement>;
    [key: string]: any;
  }

  const Plotly: Plotly;
  export default Plotly;
}
