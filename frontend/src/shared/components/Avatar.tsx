import { useState } from "react";
import { initialsOf } from "../lib/initials";

type AvatarProps = {
  name: string;
  photoUrl?: string | null;
  // Size and text classes, e.g. "size-10 text-sm". The initials keep exactly the photo's size.
  className: string;
  // Text for the photo; empty = decorative (the name is already written next to it).
  alt?: string;
};

// Profile photo, or the initials when there is no photo or it fails to load (deleted file, 404).
export function Avatar({ name, photoUrl, className, alt = "" }: AvatarProps) {
  // Remembers which URL failed, so a new photo gets its own chance to load.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (photoUrl && photoUrl !== failedUrl) {
    return (
      <img
        src={photoUrl}
        alt={alt}
        onError={() => setFailedUrl(photoUrl)}
        className={`${className} shrink-0 rounded-full object-cover`}
      />
    );
  }

  return (
    // Decorative: every screen writes the name next to the avatar.
    <span
      aria-hidden
      className={`${className} grid shrink-0 place-items-center rounded-full bg-verde-suave font-bold text-verde-tinta`}
    >
      {initialsOf(name)}
    </span>
  );
}
