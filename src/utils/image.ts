/** Lado da foto de perfil, em pixels. Suficiente para telas de alta densidade. */
const LADO = 256;
/** A API aceita até ~90 mil caracteres; fica uma folga. */
const LIMITE = 85_000;

function carregar(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("formato"));
    };
    img.src = url;
  });
}

/**
 * Prepara a foto de perfil no próprio aparelho: recorta o centro em quadrado,
 * reduz para 256x256 e converte para JPEG. Uma foto de celular de vários MB
 * vira algo em torno de 20 a 40 KB antes de sair do aparelho.
 */
export async function prepararFotoPerfil(arquivo: File): Promise<string> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem.");
  }

  let img: HTMLImageElement;
  try {
    img = await carregar(arquivo);
  } catch {
    throw new Error("Não consegui abrir essa imagem. Tente uma foto em JPG ou PNG.");
  }

  // Recorte central quadrado (como "cover").
  const lado = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - lado) / 2;
  const sy = (img.naturalHeight - lado) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = LADO;
  canvas.height = LADO;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Seu navegador não conseguiu processar a imagem.");

  // Fundo branco para PNG com transparência não virar preto no JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, LADO, LADO);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, lado, lado, 0, 0, LADO, LADO);

  for (const qualidade of [0.86, 0.75, 0.62, 0.5]) {
    const dataUrl = canvas.toDataURL("image/jpeg", qualidade);
    if (dataUrl.length <= LIMITE) return dataUrl;
  }
  throw new Error("Não consegui deixar a imagem pequena o bastante. Tente outra foto.");
}
