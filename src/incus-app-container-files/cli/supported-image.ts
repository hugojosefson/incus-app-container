export const SUPPORTED_IMAGES = [
  "debian/12/cloud",
  "ubuntu/24.04/cloud",
] as const;

export type SupportedImage = typeof SUPPORTED_IMAGES[number];
export type SupportedImageUri<I extends SupportedImage> = `images:${I}`;

export function isSupportedImage(image: unknown): image is SupportedImage {
  return SUPPORTED_IMAGES.includes(image as SupportedImage);
}

export function isSupportedImageUri(
  imageUri: unknown,
): imageUri is SupportedImageUri<SupportedImage> {
  return SUPPORTED_IMAGES.some((image) => imageUri === `images:${image}`);
}

export function toSupportedImageUri<I extends SupportedImage>(
  image: I,
): SupportedImageUri<I> {
  return `images:${image}`;
}

export function toTemplateName(
  imageUri: SupportedImageUri<SupportedImage>,
): string {
  return imageUri.toLowerCase().replace(/^images:/, "").replaceAll(
    "/",
    "-",
  )
    .replaceAll(".", "") +
    "-install";
}
