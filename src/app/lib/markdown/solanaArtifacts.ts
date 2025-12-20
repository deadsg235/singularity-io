import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

type MdastNode = {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, any>;
};

type MdastParent = MdastNode & { children: MdastNode[] };

type SolanaArtifactType = "publicKey" | "signature";

const BASE58_PATTERN = /[1-9A-HJ-NP-Za-km-z]{32,88}/g;

function classifyCandidate(candidate: string): SolanaArtifactType | null {
  try {
    // Public keys (accounts, mints) are valid inputs for PublicKey
    const key = new PublicKey(candidate);
    if (key.toBase58() === candidate) {
      return "publicKey";
    }
  } catch {
    // not a public key; try signature detection below
  }

  try {
    const decoded = bs58.decode(candidate);
    if (decoded.length === 64) {
      return "signature";
    }
  } catch {
    return null;
  }

  return null;
}

function createArtifactNode(value: string, artifactType: SolanaArtifactType): MdastNode {
  return {
    type: "solanaArtifact",
    value,
    data: {
      artifactType,
      hProperties: {
        value,
        artifactType,
      },
    },
  };
}

export const solanaArtifactsRemarkPlugin: Plugin<[], MdastParent> = () => (tree) => {
  visit(tree, "text", (node: MdastNode, index: number | null, parent: MdastParent | null) => {
    if (!parent || typeof node.value !== "string" || index === null) {
      return;
    }

    const matches = [...node.value.matchAll(BASE58_PATTERN)];
    if (matches.length === 0) {
      return;
    }

    const replacement: MdastNode[] = [];
    let lastIndex = 0;

    for (const match of matches) {
      const matchIndex = match.index ?? 0;
      const candidate = match[0];

      if (matchIndex > lastIndex) {
        replacement.push({ type: "text", value: node.value.slice(lastIndex, matchIndex) });
      }

      const artifactType = classifyCandidate(candidate);
      if (artifactType) {
        replacement.push(createArtifactNode(candidate, artifactType));
      } else {
        replacement.push({ type: "text", value: candidate });
      }

      lastIndex = matchIndex + candidate.length;
    }

    if (lastIndex < node.value.length) {
      replacement.push({ type: "text", value: node.value.slice(lastIndex) });
    }

    parent.children.splice(index, 1, ...replacement);
  });
};

export type { SolanaArtifactType };
