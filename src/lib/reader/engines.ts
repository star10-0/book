import { ReaderDocumentSource } from "@/lib/reader/types";

export type ReaderEngineDefinition = {
  key: "pdf-native" | "epub-web";
  displayName: string;
  supportsContinuousProgress: boolean;
};

export function getReaderEngine(source: ReaderDocumentSource | null): ReaderEngineDefinition | null {
  if (!source) {
    return null;
  }

  if (source.kind === "PDF") {
    return {
      key: "pdf-native",
      displayName: "PDF Viewer",
      supportsContinuousProgress: false,
    };
  }

  return {
    key: "epub-web",
    displayName: "EPUB Web Renderer",
    supportsContinuousProgress: true,
  };
}
