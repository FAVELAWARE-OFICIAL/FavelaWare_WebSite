/**
 * ============================================
 * FOTOS DOS ALUNOS NO SITE (vindas do dashboard)
 * ============================================
 *
 * A foto que o gestor põe no dashboard também aparece nas páginas de turmas.
 * Cada aluno de src/data/turmas.ts tem o participanteId (o id dele no banco);
 * a função fotos_das_turmas devolve id e foto dos alunos que estão no site
 * (foto null = sem foto), e o banco manda: trocar a foto no dashboard troca no
 * site, e apagar lá tira daqui (fica o avatar padrão).
 *
 * Usa fetch direto (sem o cliente do Supabase) para o site público continuar
 * leve. Se o banco não responder, a página fica com as fotos do arquivo.
 * O hook das páginas fica em src/hooks/useAlunosComFotoAtual.ts.
 */
import { BUCKET_FOTOS_ALUNOS, CHAVE_PUBLICAVEL_SUPABASE, URL_SUPABASE } from '../config';

// Só aceita foto do próprio site ou do bucket de fotos do projeto: um valor
// estranho no banco nunca vira imagem de outro endereço no site público
const PREFIXO_DO_BUCKET = URL_SUPABASE ? `${URL_SUPABASE}/storage/v1/object/public/${BUCKET_FOTOS_ALUNOS}/` : null;
const fotoConfiavel = (foto: string) =>
  foto.startsWith('/imgs/') || (PREFIXO_DO_BUCKET !== null && foto.startsWith(PREFIXO_DO_BUCKET));

export class ServicoFotosDoSite {
  /** Buscado uma vez por visita e reaproveitado entre as páginas de turmas */
  private promessa: Promise<Map<number, string | null>> | null = null;

  /** { id do aluno: foto atual (null = sem foto) }; vazio se o banco não responder */
  buscar(): Promise<Map<number, string | null>> {
    if (!URL_SUPABASE || !CHAVE_PUBLICAVEL_SUPABASE) return Promise.resolve(new Map());
    this.promessa ??= fetch(`${URL_SUPABASE}/rest/v1/rpc/fotos_das_turmas`, {
      method: 'POST',
      headers: {
        apikey: CHAVE_PUBLICAVEL_SUPABASE,
        Authorization: `Bearer ${CHAVE_PUBLICAVEL_SUPABASE}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
      .then((resposta) => (resposta.ok ? resposta.json() : Promise.reject(new Error(String(resposta.status)))))
      // Foto estranha (fora do site e do bucket) vira "sem foto", nunca imagem de outro endereço
      .then(
        (linhas: { id: number; foto: string | null }[]) =>
          new Map(linhas.map((l) => [l.id, typeof l.foto === 'string' && fotoConfiavel(l.foto) ? l.foto : null])),
      )
      .catch((erro) => {
        console.error('[fotos do site] ficando com as fotos do arquivo', erro?.message);
        this.promessa = null; // na próxima página tenta de novo
        return new Map<number, string | null>();
      });
    return this.promessa;
  }
}

export const servicoFotosDoSite = new ServicoFotosDoSite();
