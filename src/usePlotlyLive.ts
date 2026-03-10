import { useCallback, useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";

interface LivePlotUpdateArgs {
  traces: Array<Record<string, any>>;
  layout: Record<string, any>;
  updateData: Record<string, any>;
  traceIndices: number[];
  forceReact?: boolean;
}

interface GraphDivLike {
  data?: unknown[];
}

export const usePlotlyLive = () => {
  const plotRef = useRef<HTMLDivElement>(null);
  const isPlotInitialized = useRef(false);

  const getTraceCount = useCallback(() => {
    const graphDiv = plotRef.current as unknown as GraphDivLike | null;
    return graphDiv?.data?.length ?? 0;
  }, []);

  const renderOrUpdate = useCallback(
    ({ traces, layout, updateData, traceIndices, forceReact }: LivePlotUpdateArgs) => {
      if (!plotRef.current || traces.length === 0) {
        return;
      }

      if (!isPlotInitialized.current) {
        Plotly.newPlot(plotRef.current, traces, layout, { responsive: true });
        isPlotInitialized.current = true;
        return;
      }

      if (forceReact) {
        Plotly.react(plotRef.current, traces, layout, { responsive: true });
        return;
      }

      Plotly.update(plotRef.current, updateData, layout, traceIndices);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (plotRef.current && isPlotInitialized.current) {
        Plotly.purge(plotRef.current);
        isPlotInitialized.current = false;
      }
    };
  }, []);

  return {
    plotRef,
    getTraceCount,
    renderOrUpdate,
  };
};
