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
import { FUNDO_DA_MARCA } from '../data/imagens';

/** Versão do pacote @mediapipe/tasks-vision (a do package.json): o WASM da CDN precisa ser igual */
const VERSAO_MEDIAPIPE = '1.0.1';
const ENDERECO_WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSAO_MEDIAPIPE}/wasm`;
const ENDERECO_MODELO = '/modelos/selfie_segmenter.tflite';

/** Lado da imagem final, em px (suficiente para o avatar e leve para a página) */
const LADO = 480;
/** Círculo verde: centro e raio dentro da imagem */
const CENTRO = LADO / 2;
const RAIO = LADO * 0.46;

type Segmentador = {
  segment: (imagem: CanvasImageSource) => {
    confidenceMasks?: { getAsFloat32Array: () => Float32Array; width: number; height: number }[];
    close: () => void;
  };
};

export class ServicoFotoPadronizada {
  private segmentador: Promise<Segmentador | null> | null = null;

  /** Recebe a foto escolhida e devolve a imagem no padrão (WebP, com fundo transparente fora do círculo) */
  async padronizar(arquivo: File): Promise<Blob> {
    if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');
    const imagem = await createImageBitmap(arquivo);
    try {
      const mascara = await this.mascaraDaPessoa(imagem);
      const canvas = await this.montar(imagem, mascara);
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

  /** Monta a imagem final: círculo verde com textura e a pessoa por cima */
  private async montar(imagem: ImageBitmap, mascara: HTMLCanvasElement | null): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = LADO;
    canvas.height = LADO;
    const contexto = canvas.getContext('2d')!;

    // 1. Círculo verde da marca, com a textura do banner bem de leve
    contexto.save();
    contexto.beginPath();
    contexto.arc(CENTRO, CENTRO, RAIO, 0, Math.PI * 2);
    contexto.clip();
    const gradiente = contexto.createLinearGradient(0, 0, LADO, LADO);
    gradiente.addColorStop(0, '#9bd24f');
    gradiente.addColorStop(1, '#7ab52f');
    contexto.fillStyle = gradiente;
    contexto.fillRect(0, 0, LADO, LADO);
    const textura = await this.carregarTextura();
    if (textura) {
      contexto.globalAlpha = 0.18;
      contexto.globalCompositeOperation = 'luminosity';
      contexto.drawImage(textura, 0, 0, LADO, LADO);
      contexto.globalAlpha = 1;
      contexto.globalCompositeOperation = 'source-over';
    }
    contexto.restore();

    // 2. A pessoa: recorte quadrado do centro da foto, com o fundo tirado pela máscara
    const lado = Math.min(imagem.width, imagem.height);
    const x = (imagem.width - lado) / 2;
    const y = Math.max(0, (imagem.height - lado) / 2 - lado * 0.08); // um pouco acima do centro: o rosto
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
  async enviar(arquivo: File, pasta = ''): Promise<string> {
    const blob = await this.padronizar(arquivo);
    const caminho = `${pasta ? `${pasta}/` : ''}${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from(BUCKET_FOTOS_ALUNOS)
      .upload(caminho, blob, { contentType: 'image/webp' });
    if (error) throw new Error('Não foi possível enviar a foto.');
    return supabase.storage.from(BUCKET_FOTOS_ALUNOS).getPublicUrl(caminho).data.publicUrl;
  }

  /** Apaga do Storage uma foto que não é mais usada (só as do nosso bucket; as do site, em /imgs, ficam) */
  async apagar(url: string | null): Promise<void> {
    if (!PREFIXO_FOTOS_PUBLICAS || !url?.startsWith(PREFIXO_FOTOS_PUBLICAS)) return;
    const { error } = await supabase.storage
      .from(BUCKET_FOTOS_ALUNOS)
      .remove([url.slice(PREFIXO_FOTOS_PUBLICAS.length)]);
    if (error) console.error('[foto] ficou no Storage', error.message);
  }

  /**
   * Foto enviada no formulário que não vai ser salva (trocada de novo, tirada
   * ou formulário fechado): apaga, a menos que seja a foto que a pessoa já tinha.
   */
  async descartarNaoSalva(url: string | null, fotoOriginal: string | null): Promise<void> {
    if (url && url !== fotoOriginal) await this.apagar(url);
  }

  private async carregarTextura(): Promise<ImageBitmap | null> {
    try {
      const resposta = await fetch(FUNDO_DA_MARCA);
      return resposta.ok ? await createImageBitmap(await resposta.blob()) : null;
    } catch {
      return null;
    }
  }
}

export const servicoFotoPadronizada = new ServicoFotoPadronizada();
