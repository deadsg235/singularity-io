/* eslint-disable @next/next/no-img-element */
import React from "react";

type ImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fill?: boolean;
  sizes?: string;
  src: string | { src: string };
};

const NextImage: React.FC<ImageProps> = ({ src, alt = "", fill, style, ...rest }) => {
  const resolvedSrc = typeof src === "string" ? src : src?.src ?? "";
  const { style: restStyle, ...imgRest } = rest as React.ImgHTMLAttributes<HTMLImageElement> & {
    style?: React.CSSProperties;
  };
  const resolvedStyle = fill
    ? {
        position: "absolute" as const,
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: restStyle?.objectFit ?? style?.objectFit ?? "cover",
        ...style,
      }
    : {
        ...style,
        ...restStyle,
      };

  return <img src={resolvedSrc} alt={alt} style={resolvedStyle} {...imgRest} />;
};

export default NextImage;
