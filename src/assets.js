export const ASSET_MANIFEST = {
  frame: "../public/img/frame.png",
  spout: "../public/img/spout.png",
  slime: "../public/img/slime.png",
  button_drop: "../public/img/button_drop.png",
  gem_R_small: "../public/img/gem_R_small.png",
  gem_B_small: "../public/img/gem_B_small.png",
  gem_G_small: "../public/img/gem_G_small.png",
  gem_Y_small: "../public/img/gem_Y_small.png",
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Failed to load image asset: ${url}`));
    img.src = new URL(url, import.meta.url).href;
  });
}

export async function loadAssets(manifest = ASSET_MANIFEST) {
  const entries = await Promise.all(
    Object.entries(manifest).map(async ([key, url]) => {
      const image = await loadImage(url);
      return [key, image];
    })
  );
  return Object.fromEntries(entries);
}
