/**
 * ============================================
 * FOTO NO PADRÃO DO SITE (círculo verde)
 * ============================================
 *
 * As fotos de alunos e da equipe seguem o padrão do site: a pessoa recortada
 * sobre um círculo verde da marca, com a cabeça podendo passar da borda de cima
 * (veja public/imgs/team/ e public/imgs/turmas/sem-foto.webp). A foto enviada
 * pode ter qualquer fundo: aqui, no próprio navegador, a pessoa é separada do
 * fundo (segmentação do MediaPipe, licença Apache-2.0) e montada no padrão.
 *
 * - O modelo (250 KB) fica em public/modelos/; o motor WebAssembly vem da CDN
 *   jsdelivr, na mesma versão do pacote, e só é baixado quando alguém escolhe
 *   uma foto (import dinâmico).
 * - Se a separação falhar (navegador antigo, sem rede), a foto entra recortada
 *   no círculo, sobre o verde: o cadastro nunca trava por causa disso.
 */

import { BUCKET_FOTOS_ALUNOS, PREFIXO_FOTOS_PUBLICAS } from '../config';
import { supabase } from './supabase';
import { FUNDO_DA_FOTO } from '../data/imagens';

/** Versão do pacote @mediapipe/tasks-vision (a do package.json): o WASM da CDN precisa ser igual */
const VERSAO_MEDIAPIPE = '1.0.1';
const ENDERECO_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSAO_MEDIAPIPE}/wasm`;
const ENDERECO_MODELO = '/modelos/selfie_segmenter.tflite';

/** Lado da imagem final, em px (suficiente para o avatar e leve para a página) */
const LADO = 480;
/** Círculo verde: centro e raio dentro da imagem */
const CENTRO = LADO / 2;
// O círculo ocupa a imagem inteira, como nas fotos fixas do site: sobra de
// transparência em volta mostrava o fundo do cartão, num verde diferente
const RAIO = LADO / 2;

type Segmentador = {
  segment: (imagem: CanvasImageSource) => {
    confidenceMasks?: { getAsFloat32Array: () => Float32Array; width: number; height: number }[];
    close: () => void;
  };
};

/**
 * Enquadramento escolhido pela pessoa na janela "Ajustar foto":
 * - zoom: 1 = o maior quadrado que cabe na foto; 3 = um terço do lado;
 * - x e y: onde o quadrado fica na sobra da foto (0 = esquerda/topo, 1 = direita/base).
 */
export interface Enquadramento {
  zoom: number;
  x: number;
  y: number;
}

export const ZOOM_MAXIMO = 3;

/**
 * Verde do círculo quando o fundo das fotos (FUNDO_DA_FOTO) não carrega: o verde
 * médio das fotos fixas do site (mediana medida em public/imgs/team e hall-da-fama).
 */
export const COR_DO_CIRCULO = '#a0db53';

/** Quadrado da foto original que vai para o círculo (em px da foto) */
export interface Recorte {
  x: number;
  y: number;
  lado: number;
}

const entre = (valor: number, minimo: number, maximo: number) => Math.min(maximo, Math.max(minimo, valor));

/**
 * Recorte padrão, sem ajuste: o maior quadrado do centro, um pouco acima do meio
 * (onde costuma estar o rosto). Com enquadramento, o quadrado encolhe com o zoom e
 * anda dentro da sobra da foto, sem nunca sair dela.
 */
export function recorteDaFoto(largura: number, altura: number, enquadramento?: Enquadramento): Recorte {
  const maior = Math.min(largura, altura);
  if (!enquadramento) {
    return {
      x: (largura - maior) / 2,
      y: Math.max(0, (altura - maior) / 2 - maior * 0.08),
      lado: maior,
    };
  }
  const lado = maior / entre(enquadramento.zoom, 1, ZOOM_MAXIMO);
  return {
    x: (largura - lado) * entre(enquadramento.x, 0, 1),
    y: (altura - lado) * entre(enquadramento.y, 0, 1),
    lado,
  };
}

/**
 * Muda o zoom mantendo o centro do recorte onde está (a foto aproxima em volta
 * do que está no meio do círculo, sem escorregar para o lado)
 */
export function comZoom(largura: number, altura: number, atual: Enquadramento, zoom: number): Enquadramento {
  const antes = recorteDaFoto(largura, altura, atual);
  const lado = Math.min(largura, altura) / entre(zoom, 1, ZOOM_MAXIMO);
  const posicao = (centro: number, total: number) => {
    const sobra = total - lado;
    return sobra > 0 ? entre((centro - lado / 2) / sobra, 0, 1) : 0.5;
  };
  return {
    zoom: entre(zoom, 1, ZOOM_MAXIMO),
    x: posicao(antes.x + antes.lado / 2, largura),
    y: posicao(antes.y + antes.lado / 2, altura),
  };
}

/** O enquadramento que reproduz o recorte padrão (ponto de partida da janela de ajuste) */
export function enquadramentoPadrao(largura: number, altura: number): Enquadramento {
  const { x, y, lado } = recorteDaFoto(largura, altura);
  const sobraX = largura - lado;
  const sobraY = altura - lado;
  return { zoom: 1, x: sobraX > 0 ? x / sobraX : 0.5, y: sobraY > 0 ? y / sobraY : 0.5 };
}

export class ServicoFotoPadronizada {
  private segmentador: Promise<Segmentador | null> | null = null;

  /**
   * Recebe a foto escolhida e devolve a imagem no padrão (WebP, com fundo
   * transparente fora do círculo). Sem enquadramento, usa o recorte padrão.
   */
  async padronizar(arquivo: File, enquadramento?: Enquadramento): Promise<Blob> {
    if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
    const imagem = await createImageBitmap(arquivo);
    try {
      const mascara = await this.mascaraDaPessoa(imagem);
      const canvas = await this.montar(imagem, mascara, recorteDaFoto(imagem.width, imagem.height, enquadramento));
      return await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto.'))),
          'image/webp',
          0.9,
        ),
      );
    } finally {
      imagem.close();
    }
  }

  /** Carrega o segmentador uma vez por visita (null se não der: segue sem recorte) */
  private carregarSegmentador(): Promise<Segmentador | null> {
    this.segmentador ??= (async () => {
      try {
        const { FilesetResolver, ImageSegmenter } = await import('@mediapipe/tasks-vision');
        const arquivos = await FilesetResolver.forVisionTasks(ENDERECO_WASM);
        return (await ImageSegmenter.createFromOptions(arquivos, {
          baseOptions: { modelAssetPath: ENDERECO_MODELO },
          runningMode: 'IMAGE',
          outputConfidenceMasks: true,
          outputCategoryMask: false,
        })) as unknown as Segmentador;
      } catch (erro) {
        console.error('[foto] segmentação indisponível; a foto entra sem recorte', (erro as Error)?.message);
        this.segmentador = null; // na próxima foto tenta de novo
        return null;
      }
    })();
    return this.segmentador;
  }

  /** Máscara da pessoa (canvas com alfa = pessoa), no tamanho da imagem; null = sem recorte */
  private async mascaraDaPessoa(imagem: ImageBitmap): Promise<HTMLCanvasElement | null> {
    const segmentador = await this.carregarSegmentador();
    if (!segmentador) return null;
    try {
      const resultado = segmentador.segment(imagem);
      const confianca = resultado.confidenceMasks?.[0];
      if (!confianca) return null;
      const valores = confianca.getAsFloat32Array();
      const mascara = document.createElement('canvas');
      mascara.width = confianca.width;
      mascara.height = confianca.height;
      const contexto = mascara.getContext('2d')!;
      const pixels = contexto.createImageData(confianca.width, confianca.height);
      for (let i = 0; i < valores.length; i++) {
        pixels.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, valores[i])) * 255);
      }
      contexto.putImageData(pixels, 0, 0);
      resultado.close();
      return mascara;
    } catch (erro) {
      console.error('[foto] falha ao separar a pessoa; a foto entra sem recorte', (erro as Error)?.message);
      return null;
    }
  }

  /** Monta a imagem final: o fundo das fotos do site e a pessoa por cima */
  private async montar(
    imagem: ImageBitmap,
    mascara: HTMLCanvasElement | null,
    { x, y, lado }: Recorte,
  ): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = LADO;
    canvas.height = LADO;
    const contexto = canvas.getContext('2d')!;

    // 1. O círculo com o fundo das fotos fixas (reflexos e a comunidade embaixo);
    //    se ele não carregar, o verde médio delas
    contexto.save();
    contexto.beginPath();
    contexto.arc(CENTRO, CENTRO, RAIO, 0, Math.PI * 2);
    contexto.clip();
    contexto.fillStyle = COR_DO_CIRCULO;
    contexto.fillRect(0, 0, LADO, LADO);
    const fundo = await this.carregarFundo();
    if (fundo) contexto.drawImage(fundo, 0, 0, LADO, LADO);
    contexto.restore();

    // 2. A pessoa: o recorte quadrado da foto, com o fundo tirado pela máscara
    const pessoa = document.createElement('canvas');
    pessoa.width = LADO;
    pessoa.height = LADO;
    const contextoPessoa = pessoa.getContext('2d')!;
    contextoPessoa.drawImage(imagem, x, y, lado, lado, 0, 0, LADO, LADO);
    if (mascara) {
      const escalaX = mascara.width / imagem.width;
      const escalaY = mascara.height / imagem.height;
      contextoPessoa.globalCompositeOperation = 'destination-in';
      contextoPessoa.drawImage(mascara, x * escalaX, y * escalaY, lado * escalaX, lado * escalaY, 0, 0, LADO, LADO);
    }

    // 3. Por cima do círculo: dentro dele, e a cabeça pode passar da borda de cima
    contexto.save();
    contexto.beginPath();
    contexto.arc(CENTRO, CENTRO, RAIO, 0, Math.PI * 2);
    if (mascara) contexto.rect(0, 0, LADO, CENTRO);
    contexto.clip();
    contexto.drawImage(pessoa, 0, 0);
    contexto.restore();
    return canvas;
  }

  /**
   * Padroniza e envia ao Storage (bucket público das fotos). `pasta` separa as
   * fotos de alunos (raiz) das da equipe ("equipe"). Devolve a URL pública.
   */
  async enviar(arquivo: File, pasta = '', enquadramento?: Enquadramento): Promise<string> {
    const blob = await this.padronizar(arquivo, enquadramento);
    const caminho = `${pasta ? `${pasta}/` : ''}${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from(BUCKET_FOTOS_ALUNOS)
      .upload(caminho, blob, { contentType: 'image/webp' });
    if (error) throw new Error('Não foi possível enviar a foto.');
    return supabase.storage.from(BUCKET_FOTOS_ALUNOS).getPublicUrl(caminho).data.publicUrl;
  }

  /**
   * Troca uma foto: envia a nova e grava onde ela é usada (`gravar`). Se a
   * gravação falhar, a nova sai do Storage e o erro segue; se der certo, sai a
   * antiga. Devolve a URL nova.
   */
  async trocar(
    arquivo: File,
    pasta: string,
    gravar: (url: string) => Promise<void>,
    fotoAntiga: string | null,
    enquadramento?: Enquadramento,
  ): Promise<string> {
    const url = await this.enviar(arquivo, pasta, enquadramento);
    try {
      await gravar(url);
    } catch (erro) {
      await this.apagar(url);
      throw erro;
    }
    await this.apagar(fotoAntiga);
    return url;
  }

  /** Apaga do Storage uma foto que não é mais usada (só as do nosso bucket; as do site, em /imgs, ficam) */
  async apagar(url: string | null): Promise<void> {
    if (!PREFIXO_FOTOS_PUBLICAS || !url?.startsWith(PREFIXO_FOTOS_PUBLICAS)) return;
    const { data, error } = await supabase.storage
      .from(BUCKET_FOTOS_ALUNOS)
      .remove([url.slice(PREFIXO_FOTOS_PUBLICAS.length)]);
    if (error) console.error('[foto] ficou no Storage', error.message);
    // Sem erro e sem arquivo apagado: a permissão não deixou (ex.: foto do hall)
    else if (data && !data.length) console.info('[foto] ficou no Storage (sem permissão para apagar)');
  }

  /**
   * Foto enviada no formulário que não vai ser salva (trocada de novo, tirada
   * ou formulário fechado): apaga, a menos que seja a foto que a pessoa já tinha.
   */
  async descartarNaoSalva(url: string | null, fotoOriginal: string | null): Promise<void> {
    if (url && url !== fotoOriginal) await this.apagar(url);
  }

  /** O fundo das fotos (null se não carregar: fica o verde médio) */
  private async carregarFundo(): Promise<ImageBitmap | null> {
    try {
      const resposta = await fetch(FUNDO_DA_FOTO);
      return resposta.ok ? await createImageBitmap(await resposta.blob()) : null;
    } catch (erro) {
      console.error('[foto] fundo das fotos indisponível; fica o verde', (erro as Error)?.message);
      return null;
    }
  }
}

export const servicoFotoPadronizada = new ServicoFotoPadronizada();
