/**
 * ============================================
 * ALUNOS (CADASTRO DO GESTOR)
 * ============================================
 *
 * Cadastro, edição e remoção de alunos de uma edição, e a foto de cada um
 * (Supabase Storage). O banco só aceita gravação de quem é gestor (RLS).
 */
import { BUCKET_FOTOS_ALUNOS } from '../config';
import { vazioViraNulo } from '../utils/texto';
import { mensagemDeErroDeCadastro } from './banco';
import { supabase } from './supabase';

export interface DadosDoAluno {
  nome: string;
  login: string;
  turma_id: number;
  observacao: string;
  foto: string | null;
}

/** px: suficiente para o avatar, e o arquivo fica pequeno */
const LADO_DA_FOTO = 400;

/** Parte da URL pública que identifica uma foto do bucket (fotos do site, em /imgs, ficam de fora) */
const MARCADOR_DO_BUCKET = `/storage/v1/object/public/${BUCKET_FOTOS_ALUNOS}/`;

export class ServicoAlunos {
  async salvar(edicaoId: number, dados: DadosDoAluno, id?: number): Promise<string | null> {
    const campos = {
      nome: dados.nome.trim(),
      login: vazioViraNulo(dados.login),
      turma_id: dados.turma_id,
      observacao: vazioViraNulo(dados.observacao),
      foto: dados.foto,
    };
    const { error } = id
      ? await supabase.from('participantes').update(campos).eq('id', id)
      : await supabase.from('participantes').insert({ ...campos, edicao_id: edicaoId, funcao: 'aluno' });
    return error ? mensagemDeErroDeCadastro(error, 'Não foi possível salvar o aluno.') : null;
  }

  /** Remove o aluno e TODO o histórico de presença dele */
  async remover(id: number): Promise<string | null> {
    const { error } = await supabase.from('participantes').delete().eq('id', id);
    return error ? 'Não foi possível remover o aluno.' : null;
  }

  /**
   * Reduz a foto no próprio navegador (400x400, recorte central, WebP) e envia.
   * Uma foto de celular de 4 MB vira ~30 KB: a página de alunos carrega rápido.
   */
  async enviarFoto(arquivo: File): Promise<string> {
    if (!arquivo.type.startsWith('image/')) throw new Error('Escolha um arquivo de imagem.');

    const imagem = await createImageBitmap(arquivo);
    const lado = Math.min(imagem.width, imagem.height);
    const canvas = document.createElement('canvas');
    canvas.width = LADO_DA_FOTO;
    canvas.height = LADO_DA_FOTO;
    canvas.getContext('2d')!.drawImage(
      imagem,
      (imagem.width - lado) / 2,
      (imagem.height - lado) / 2,
      lado,
      lado, // recorte quadrado do meio
      0,
      0,
      LADO_DA_FOTO,
      LADO_DA_FOTO,
    );
    imagem.close();

    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Não foi possível processar a foto.'))),
        'image/webp',
        0.85,
      ),
    );

    const caminho = `${crypto.randomUUID()}.webp`;
    const { error } = await supabase.storage
      .from(BUCKET_FOTOS_ALUNOS)
      .upload(caminho, blob, { contentType: 'image/webp' });
    if (error) throw new Error('Não foi possível enviar a foto.');
    return supabase.storage.from(BUCKET_FOTOS_ALUNOS).getPublicUrl(caminho).data.publicUrl;
  }

  /** Apaga do Storage uma foto que não é mais usada (fotos do site, em /imgs, ficam) */
  async apagarFoto(url: string | null): Promise<void> {
    if (!url?.includes(MARCADOR_DO_BUCKET)) return;
    const { error } = await supabase.storage.from(BUCKET_FOTOS_ALUNOS).remove([url.split(MARCADOR_DO_BUCKET)[1]]);
    if (error) console.error('[alunos] foto ficou no Storage', error.message);
  }

  /**
   * Foto enviada no formulário que não vai ser salva (trocada de novo, tirada
   * ou formulário fechado): apaga, a menos que seja a foto que o aluno já tinha.
   */
  async descartarFotoNaoSalva(url: string | null, fotoOriginal: string | null): Promise<void> {
    if (url && url !== fotoOriginal) await this.apagarFoto(url);
  }
}

export const servicoAlunos = new ServicoAlunos();
