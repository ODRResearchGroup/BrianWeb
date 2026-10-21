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
    [key: string]: unknown;
  }

  interface Layout {
    title?: string;
    xaxis?: Record<string, unknown>;
    yaxis?: Record<string, unknown>;
    hovermode?: string;
    margin?: {
      l?: number;
      r?: number;
      t?: number;
      b?: number;
    };
    [key: string]: unknown;
  }

  interface Config {
    responsive?: boolean;
    displayModeBar?: boolean;
    [key: string]: unknown;
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
    update(
      div: HTMLElement | string,
      data_update?: Record<string, unknown>,
      layout_update?: Record<string, unknown>,
      traceIndices?: number[]
    ): Promise<HTMLElement>;
    purge(div: HTMLElement | string): void;
    [key: string]: unknown;
  }

  const Plotly: Plotly;
  export default Plotly;
}
