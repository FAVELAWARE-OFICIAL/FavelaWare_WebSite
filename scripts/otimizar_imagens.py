"""
Converte as imagens de public/imgs para WebP (bem mais leve) e troca as
referências no código.

- Reduz o tamanho máximo conforme o uso: fotos de pessoas (turmas, equipe,
  Hall da Fama) até 600 px; galeria, fundos e fotos de turma até 1600 px.
- Só troca quando o WebP sai pelo menos 20% menor que o original.
- Troca os caminhos em src/ e index.html e apaga o original.
- Grava a lista de trocas em <saida.json>, para atualizar também os caminhos
  guardados no banco (fotos dos alunos e dos perfis).

Uso (precisa de: pip install pillow):
    python scripts/otimizar_imagens.py <saida.json>
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

RAIZ = Path(__file__).resolve().parent.parent
PASTA = RAIZ / 'public' / 'imgs'
EXTENSOES = {'.png', '.jpg', '.jpeg'}
ECONOMIA_MINIMA = 0.20

# Pastas de retrato: aparecem pequenas (avatar, cartão), 600 px sobra para tela retina
RETRATOS = {'turmas', 'team', 'hall-da-fama'}


def lado_maximo(caminho: Path) -> int:
    pasta = caminho.relative_to(PASTA).parts[0]
    if pasta in RETRATOS and not caminho.stem.startswith('foto-turma'):
        return 600
    return 1600


def converter(caminho: Path) -> Path | None:
    destino = caminho.with_suffix('.webp')
    if destino.exists():
        return None
    with Image.open(caminho) as imagem:
        imagem = ImageOps.exif_transpose(imagem)  # respeita a rotação da câmera
        imagem.thumbnail((lado_maximo(caminho),) * 2, Image.Resampling.LANCZOS)
        modo = 'RGBA' if imagem.mode in ('RGBA', 'LA', 'P') else 'RGB'
        imagem.convert(modo).save(destino, 'WEBP', quality=80, method=6)
    if destino.stat().st_size > caminho.stat().st_size * (1 - ECONOMIA_MINIMA):
        destino.unlink()  # não compensou: fica o original
        return None
    return destino


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)

    trocas = {}
    antes = depois = 0
    for caminho in sorted(PASTA.rglob('*')):
        if caminho.suffix.lower() not in EXTENSOES:
            continue
        tamanho = caminho.stat().st_size
        destino = converter(caminho)
        antes += tamanho
        if destino is None:
            depois += tamanho
            continue
        depois += destino.stat().st_size
        antigo = '/' + caminho.relative_to(RAIZ / 'public').as_posix()
        trocas[antigo] = '/' + destino.relative_to(RAIZ / 'public').as_posix()

    # Troca as referências no código (src/ e index.html)
    arquivos = [RAIZ / 'index.html', *(RAIZ / 'src').rglob('*.ts'), *(RAIZ / 'src').rglob('*.tsx'), *(RAIZ / 'src').rglob('*.css')]
    for arquivo in arquivos:
        texto = arquivo.read_text(encoding='utf-8')
        novo = texto
        for antigo, atual in trocas.items():
            novo = novo.replace(antigo, atual)
        if novo != texto:
            arquivo.write_text(novo, encoding='utf-8')

    # A Galeria guarda só o nome do arquivo ('foto.jpg') e monta /imgs/gallery/ no JSX
    galeria = RAIZ / 'src' / 'pages' / 'Galeria.tsx'
    texto = galeria.read_text(encoding='utf-8')
    for antigo, atual in trocas.items():
        if antigo.startswith('/imgs/gallery/'):
            texto = texto.replace(f"'{antigo.rsplit('/', 1)[1]}'", f"'{atual.rsplit('/', 1)[1]}'")
    galeria.write_text(texto, encoding='utf-8')

    for antigo in trocas:
        (RAIZ / 'public' / antigo.lstrip('/')).unlink()

    Path(sys.argv[1]).write_text(json.dumps(trocas, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f'{len(trocas)} imagens convertidas: {antes / 1e6:.1f} MB -> {depois / 1e6:.1f} MB')


if __name__ == '__main__':
    main()
