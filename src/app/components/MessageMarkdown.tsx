"use client";

import type {
  AnchorHTMLAttributes,
  DetailedHTMLProps,
  PropsWithChildren,
  ReactNode,
} from "react";
import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Options as RemarkRehypeOptions } from "remark-rehype";
import { solanaArtifactsRemarkPlugin } from "@/app/lib/markdown/solanaArtifacts";
import SolanaArtifactBadge from "./solana/SolanaArtifactBadge";

const MAX_LINK_LABEL_LENGTH = 48;

const CUSTOM_REMARK_PASSTHROUGH: NonNullable<RemarkRehypeOptions["passThrough"]> = [
  // Extend this list when adding new custom remark nodes (e.g. token tickers, program IDs).
  "solanaArtifact" as any,
];

type AnchorProps = DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;

function ensureStringChild(children: ReactNode): string | undefined {
  if (typeof children === "string") {
    return children;
  }
  if (Array.isArray(children) && children.length > 0) {
    const [first] = children;
    if (typeof first === "string") {
      return first;
    }
  }
  return undefined;
}

function shortenLabel(label: string) {
  if (label.length <= MAX_LINK_LABEL_LENGTH) {
    return label;
  }
  const prefix = label.slice(0, Math.ceil(MAX_LINK_LABEL_LENGTH / 2) - 1);
  const suffix = label.slice(-Math.floor(MAX_LINK_LABEL_LENGTH / 2) + 1);
  return `${prefix}…${suffix}`;
}

function SmartLink(props: AnchorProps) {
  const { children, href, ...rest } = props;
  const rawLabel = ensureStringChild(children);
  const displayLabel = rawLabel ? shortenLabel(rawLabel) : children;

  return (
    <a
      {...rest}
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-flux underline decoration-dotted underline-offset-2 transition hover:text-iris focus:outline-none focus:ring-2 focus:ring-flux/40"
    >
      {displayLabel}
    </a>
  );
}

type MessageMarkdownProps = PropsWithChildren<{
  className?: string;
}>;

export function MessageMarkdown({ children, className }: MessageMarkdownProps) {
  const content = typeof children === "string" ? children : "";
  const componentsMap = useMemo(
    () =>
      ({
        a: (props: AnchorProps) => <SmartLink {...props} />,
        /**
         * Custom artifact nodes are passed through from remark (see passThrough above).
         * When introducing new artifact node types, register them here so they render.
         */
        solanaArtifact: ({ node }: { node: any }) => {
          const artifactData = node?.data ?? {};
          const hProperties = artifactData?.hProperties ?? {};
          const artifactProps = node?.properties ?? hProperties;

          const artifactValue =
            typeof node?.value === "string"
              ? node.value
              : typeof artifactProps?.value === "string"
                ? artifactProps.value
                : typeof artifactData?.value === "string"
                  ? artifactData.value
                  : Array.isArray(node?.children) && typeof node.children[0]?.value === "string"
                    ? node.children[0].value
                    : typeof hProperties?.value === "string"
                      ? hProperties.value
                      : undefined;

          const artifactType =
            artifactProps?.artifactType ?? artifactData?.artifactType ?? hProperties?.artifactType;

          if (!artifactValue) {
            return null;
          }

          if (!artifactType) {
            return <>{artifactValue}</>;
          }

          return <SolanaArtifactBadge value={artifactValue} type={artifactType} />;
        },
      }) as Record<string, any>,
    [],
  );

  return (
    <ReactMarkdown
      className={className}
      remarkPlugins={[remarkGfm, solanaArtifactsRemarkPlugin]}
      remarkRehypeOptions={{
        /**
         * Keep custom artifact nodes produced by our remark plugins so the React renderer
         * can swap them for richer components. When adding new artifact types (e.g. token
         * tickers), add the node name here and provide a matching entry in the components map.
         */
        passThrough: CUSTOM_REMARK_PASSTHROUGH,
      }}
      components={componentsMap}
    >
      {content}
    </ReactMarkdown>
  );
}
export default MessageMarkdown;
