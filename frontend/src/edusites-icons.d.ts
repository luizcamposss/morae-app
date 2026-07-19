declare module "@edusites/icons/core" {
  type SvgIconeOptions = {
    nome: string;
    cor?: string;
    tamanho?: number | string;
    className?: string;
  };

  export function svgIcone(options: SvgIconeOptions): string | undefined;
}
