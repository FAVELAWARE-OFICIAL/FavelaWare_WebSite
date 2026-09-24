/**
 * ============================================
 * PEÇAS VISUAIS DA ÁREA ADMINISTRATIVA
 * ============================================
 *
 * Estilo de ferramenta de trabalho, diferente do site institucional:
 * fundo cinza, cartões brancos com borda fina, sombra leve, texto compacto
 * e sem animação de entrada (quem usa o painel quer os números rápido).
 */
import { FAIXAS, FILTROS_INICIAIS, type Filtros } from '../../lib/painel';
import { useAdmin } from '../../pages/admin/contexto';
import { campo, foco, superficie, texto } from './designSystem';
import Janela from './Janela';

export const Cartao: React.FC<{
  titulo?: string;
  descricao?: string;
  acoes?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ titulo, descricao, acoes, children, className = '' }) => (
  <section className={`${superficie.cartao} ${className}`}>
    {(titulo || acoes) && (
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          {titulo && <h2 className={`${texto.titulo}`}>{titulo}</h2>}
          {descricao && <p className={`mt-0.5 ${texto.apoio}`}>{descricao}</p>}
        </div>
        {acoes}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

export const Indicador: React.FC<{
  rotulo: string;
  valor: string;
  detalhe?: string;
  tom?: 'normal' | 'alerta' | 'positivo';
}> = ({ rotulo, valor, detalhe, tom = 'normal' }) => {
  const cor = { normal: 'text-gray-900', alerta: 'text-red-600', positivo: 'text-favela-green-700' }[tom];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <p className={`${texto.rotuloMaiusculo}`}>{rotulo}</p>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${cor}`}>{valor}</p>
      {detalhe && <p className={`mt-1 ${texto.apoio}`}>{detalhe}</p>}
    </div>
  );
};

/** Frase curta abaixo do título da página (o título mora na barra superior) */
export const Introducao: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-6 max-w-3xl text-sm text-gray-600">{children}</p>
);

export const Vazio: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={`${superficie.vazio} px-6 py-12 text-center text-sm text-gray-500`}>{children}</div>
);

/** Atalhos com o nome antigo (usados nas páginas) */
export const classeCampo = campo;

/** Caixa de texto longo: tamanho fixo (a pessoa não arrasta o canto para mudar) */
export const classeTextoLongo = `${campo} resize-none`;

export const classeRotulo = texto.rotulo;

const VARIANTES = {
  primario: 'bg-favela-green-600 text-white hover:bg-favela-green-700',
  secundario: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
  perigo: 'text-red-700 hover:bg-red-50',
};

const TAMANHOS = {
  normal: 'px-4 py-2 text-sm',
  pequeno: 'px-3 py-1.5 text-xs',
};

/** Classes do botão padrão (também para um Link que tem cara de botão) */
export const classeDoBotao = (
  variante: keyof typeof VARIANTES = 'secundario',
  tamanho: keyof typeof TAMANHOS = 'normal',
) =>
  `inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors ${TAMANHOS[tamanho]} ${foco} focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTES[variante]}`;

/** Botão padrão das áreas restritas */
export const Botao: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variante?: keyof typeof VARIANTES; tamanho?: keyof typeof TAMANHOS }
> = ({ variante = 'secundario', tamanho = 'normal', className = '', type = 'button', ...resto }) => (
  <button type={type} className={`${classeDoBotao(variante, tamanho)} ${className}`} {...resto} />
);

/**
 * Janela de confirmação de uma ação que não tem volta (salvar e travar, tirar
 * alguém...). O foco começa em "Voltar", para Enter não confirmar sem querer.
 */
export const JanelaDeConfirmacao: React.FC<{
  titulo: string;
  aberta: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
  ocupado?: boolean;
  rotuloConfirmar: string;
  rotuloOcupado?: string;
  rotuloVoltar?: string;
  variante?: 'primario' | 'perigo';
  children: React.ReactNode;
}> = ({
  titulo,
  aberta,
  aoFechar,
  aoConfirmar,
  ocupado,
  rotuloConfirmar,
  rotuloOcupado = 'Aguarde…',
  rotuloVoltar = 'Revisar',
  variante = 'primario',
  children,
}) => (
  <Janela titulo={titulo} aberta={aberta} onFechar={aoFechar} focoInicial="fechar">
    <div className="space-y-4">
      <div className={texto.corpo}>{children}</div>
      <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
        <Botao onClick={aoFechar} disabled={ocupado}>
          {rotuloVoltar}
        </Botao>
        <Botao variante={variante} onClick={aoConfirmar} disabled={ocupado}>
          {ocupado ? rotuloOcupado : rotuloConfirmar}
        </Botao>
      </div>
    </div>
  </Janela>
);

export type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string } | null;

/** Aviso de sucesso ou erro (erro é anunciado na hora pelo leitor de tela) */
export const Aviso: React.FC<{ mensagem: Mensagem; className?: string }> = ({ mensagem, className = 'mb-6' }) =>
  mensagem && (
    <div
      role={mensagem.tipo === 'erro' ? 'alert' : 'status'}
      className={`rounded-lg border p-3 text-sm ${className} ${
        mensagem.tipo === 'sucesso'
          ? 'border-green-300 bg-green-50 text-green-800'
          : 'border-red-300 bg-red-50 text-red-800'
      }`}
    >
      {mensagem.texto}
    </div>
  );

/**
 * Barra de filtros. Os filtros moram no layout, então continuam valendo
 * ao trocar de página no menu. `campos` escolhe quais aparecem em cada página.
 * `extras` entra depois dos filtros (ex.: "Ordenar por"); `acoes` fica à
 * direita, na mesma caixa (ex.: "+ Novo aluno") — sem abrir buraco na página.
 */
export const BarraDeFiltros: React.FC<{
  campos?: (keyof Filtros)[];
  extras?: React.ReactNode;
  acoes?: React.ReactNode;
}> = ({ campos = ['turma', 'busca', 'faixa', 'dataDe', 'dataAte'], extras, acoes }) => {
  const { dados, filtros, setFiltros } = useAdmin();
  const mostrar = (c: keyof Filtros) => campos.includes(c);
  const alterado = campos.some((c) => filtros[c] !== FILTROS_INICIAIS[c]);

  const handleFiltro = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFiltros((anterior) => ({ ...anterior, [name]: value }));
  };

  return (
    <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {mostrar('turma') && (
        <div className="w-full sm:w-48">
          <label htmlFor="filtro-turma" className={`${texto.rotulo}`}>
            Turma
          </label>
          <select id="filtro-turma" name="turma" value={filtros.turma} onChange={handleFiltro} className={classeCampo}>
            <option value="todas">Todas as turmas</option>
            {dados.turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </div>
      )}
      {mostrar('busca') && (
        <div className="w-full sm:w-56">
          <label htmlFor="filtro-busca" className={`${texto.rotulo}`}>
            Aluno
          </label>
          <input
            id="filtro-busca"
            name="busca"
            type="search"
            value={filtros.busca}
            onChange={handleFiltro}
            placeholder="Nome ou login"
            className={classeCampo}
          />
        </div>
      )}
      {mostrar('faixa') && (
        <div className="w-full sm:w-44">
          <label htmlFor="filtro-faixa" className={`${texto.rotulo}`}>
            Frequência
          </label>
          <select id="filtro-faixa" name="faixa" value={filtros.faixa} onChange={handleFiltro} className={classeCampo}>
            <option value="todas">Todas as faixas</option>
            <option value="risco">Em risco (abaixo de 75%)</option>
            {FAIXAS.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.rotulo}
              </option>
            ))}
          </select>
        </div>
      )}
      {mostrar('dataDe') && (
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label htmlFor="filtro-de" className={`${texto.rotulo}`}>
            De
          </label>
          <input
            id="filtro-de"
            name="dataDe"
            type="date"
            value={filtros.dataDe}
            onChange={handleFiltro}
            className={classeCampo}
          />
        </div>
      )}
      {mostrar('dataAte') && (
        <div className="w-[calc(50%-0.375rem)] sm:w-40">
          <label htmlFor="filtro-ate" className={`${texto.rotulo}`}>
            Até
          </label>
          <input
            id="filtro-ate"
            name="dataAte"
            type="date"
            value={filtros.dataAte}
            onChange={handleFiltro}
            className={classeCampo}
          />
        </div>
      )}
      {alterado && (
        <button
          type="button"
          onClick={() => setFiltros(FILTROS_INICIAIS)}
          className={`rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${foco}`}
        >
          Limpar filtros
        </button>
      )}
      {extras}
      {acoes && <div className="ml-auto flex items-end gap-3">{acoes}</div>}
    </div>
  );
};
