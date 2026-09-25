/**
 * ============================================
 * AJUSTAR FOTO
 * ============================================
 *
 * Janela aberta depois de escolher a foto: a pessoa vê como ela fica no círculo
 * e ajusta o zoom e a posição (arrastando a prévia ou pelos controles, que são
 * o caminho pelo teclado). O recorte escolhido segue para a padronização, que tira o
 * fundo ao salvar (a prévia mostra a foto inteira, ainda com o fundo).
 */
import { useEffect, useRef, useState } from 'react';

import {
  comZoom,
  DEGRADE_DO_CIRCULO,
  enquadramentoPadrao,
  recorteDaFoto,
  ZOOM_MAXIMO,
  type Enquadramento,
} from '../../lib/fotoPadronizada';
import Janela from './Janela';
import { Botao, classeRotulo } from './Ui';
import { foco, texto } from './designSystem';

/** Lado da prévia na tela, em px (o canvas desenha no dobro, para ficar nítido) */
const TAMANHO_DA_PREVIA = 240;
const RESOLUCAO = TAMANHO_DA_PREVIA * 2;

const entre0e1 = (valor: number) => Math.min(1, Math.max(0, valor));

const AjustarFoto: React.FC<{
  /** Foto escolhida; null = janela fechada */
  arquivo: File | null;
  aoConfirmar: (enquadramento: Enquadramento) => void;
  aoCancelar: () => void;
}> = ({ arquivo, aoConfirmar, aoCancelar }) => {
  const [imagem, setImagem] = useState<ImageBitmap | null>(null);
  const [enquadramento, setEnquadramento] = useState<Enquadramento>({ zoom: 1, x: 0.5, y: 0.5 });
  const [erro, setErro] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const arraste = useRef<{ px: number; py: number; inicio: Enquadramento } | null>(null);

  // Abre a foto escolhida e começa no recorte padrão (o mesmo de quem não ajusta nada)
  useEffect(() => {
    // Fechada: nada da vez anterior fica para a próxima abertura
    if (!arquivo) {
      setImagem(null);
      setErro(null);
      return;
    }
    let ativo = true;
    let aberta: ImageBitmap | null = null;
    setErro(null);
    setImagem(null);
    createImageBitmap(arquivo)
      .then((bitmap) => {
        aberta = bitmap;
        if (!ativo) return bitmap.close();
        setImagem(bitmap);
        setEnquadramento(enquadramentoPadrao(bitmap.width, bitmap.height));
      })
      .catch((e) => {
        console.error('[foto] não abriu a foto para ajustar', (e as Error)?.message);
        if (ativo) setErro('Não foi possível abrir esta imagem. Escolha outra foto.');
      });
    return () => {
      ativo = false;
      aberta?.close();
    };
  }, [arquivo]);

  // Prévia: o círculo verde e o recorte escolhido dentro dele
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagem) return;
    const contexto = canvas.getContext('2d')!;
    const { x, y, lado } = recorteDaFoto(imagem.width, imagem.height, enquadramento);
    contexto.clearRect(0, 0, RESOLUCAO, RESOLUCAO);
    contexto.save();
    contexto.beginPath();
    contexto.arc(RESOLUCAO / 2, RESOLUCAO / 2, RESOLUCAO / 2, 0, Math.PI * 2);
    contexto.clip();
    const degrade = contexto.createLinearGradient(0, 0, RESOLUCAO, RESOLUCAO);
    degrade.addColorStop(0, DEGRADE_DO_CIRCULO[0]);
    degrade.addColorStop(1, DEGRADE_DO_CIRCULO[1]);
    contexto.fillStyle = degrade;
    contexto.fillRect(0, 0, RESOLUCAO, RESOLUCAO);
    contexto.drawImage(imagem, x, y, lado, lado, 0, 0, RESOLUCAO, RESOLUCAO);
    contexto.restore();
  }, [imagem, enquadramento]);

  const mudar = (mudanca: Partial<Enquadramento>) => setEnquadramento((e) => ({ ...e, ...mudanca }));

  /** Desloca a foto na tela (em px da prévia): arrastar para a direita mostra mais da esquerda */
  const deslocar = (inicio: Enquadramento, dx: number, dy: number) => {
    if (!imagem) return;
    const { lado } = recorteDaFoto(imagem.width, imagem.height, inicio);
    const pxDaFoto = lado / TAMANHO_DA_PREVIA;
    const sobraX = imagem.width - lado;
    const sobraY = imagem.height - lado;
    setEnquadramento({
      ...inicio,
      x: sobraX > 0 ? entre0e1(inicio.x - (dx * pxDaFoto) / sobraX) : inicio.x,
      y: sobraY > 0 ? entre0e1(inicio.y - (dy * pxDaFoto) / sobraY) : inicio.y,
    });
  };

  const controle = (
    id: string,
    rotulo: string,
    valor: number,
    minimo: number,
    maximo: number,
    aoMudar: (v: number) => void,
    [inicio, fim]: [string, string],
  ) => (
    <div>
      <label htmlFor={id} className={classeRotulo}>
        {rotulo}
      </label>
      <input
        id={id}
        type="range"
        min={minimo}
        max={maximo}
        step={0.01}
        value={valor}
        onChange={(e) => aoMudar(Number(e.target.value))}
        className="w-full accent-favela-green-600"
      />
      <div className={`flex justify-between ${texto.apoio}`}>
        <span>{inicio}</span>
        <span>{fim}</span>
      </div>
    </div>
  );

  return (
    <Janela
      titulo="Ajustar foto"
      aberta={arquivo !== null}
      onFechar={aoCancelar}
      rodape={
        <div className="flex flex-wrap justify-end gap-2">
          <Botao onClick={aoCancelar}>Cancelar</Botao>
          <Botao variante="primario" disabled={!imagem} onClick={() => aoConfirmar(enquadramento)}>
            Salvar foto
          </Botao>
        </div>
      }
    >
      {erro ? (
        <p className="text-sm text-red-700">{erro}</p>
      ) : (
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <canvas
              ref={canvasRef}
              width={RESOLUCAO}
              height={RESOLUCAO}
              role="img"
              aria-label="Prévia da foto. Arraste para mudar a posição."
              style={{ width: TAMANHO_DA_PREVIA, height: TAMANHO_DA_PREVIA }}
              className={`cursor-grab touch-none rounded-full bg-gray-100 shadow-inner active:cursor-grabbing ${foco}`}
              onPointerDown={(e) => {
                if (e.button !== 0) return; // só o botão principal (ou o dedo) arrasta
                e.currentTarget.setPointerCapture(e.pointerId);
                arraste.current = { px: e.clientX, py: e.clientY, inicio: enquadramento };
              }}
              onPointerMove={(e) => {
                const a = arraste.current;
                if (a) deslocar(a.inicio, e.clientX - a.px, e.clientY - a.py);
              }}
              onPointerUp={() => (arraste.current = null)}
              onPointerCancel={() => (arraste.current = null)}
            />
            <p className={`max-w-[15rem] text-center ${texto.apoio}`}>Arraste a foto. O fundo sai ao salvar.</p>
          </div>

          <div className="w-full min-w-0 flex-1 space-y-4">
            {controle(
              'foto-zoom',
              'Zoom',
              enquadramento.zoom,
              1,
              ZOOM_MAXIMO,
              // Aproxima em volta do meio do círculo
              (zoom) => imagem && setEnquadramento((e) => comZoom(imagem.width, imagem.height, e, zoom)),
              ['Menos', 'Mais'],
            )}
            {controle('foto-horizontal', 'Horizontal', enquadramento.x, 0, 1, (x) => mudar({ x }), [
              'Esquerda',
              'Direita',
            ])}
            {controle('foto-vertical', 'Vertical', enquadramento.y, 0, 1, (y) => mudar({ y }), ['Cima', 'Baixo'])}
            <div className="flex flex-wrap gap-2">
              <Botao tamanho="pequeno" disabled={!imagem} onClick={() => mudar({ x: 0.5, y: 0.5 })}>
                Centralizar
              </Botao>
              <Botao
                tamanho="pequeno"
                disabled={!imagem}
                onClick={() => imagem && setEnquadramento(enquadramentoPadrao(imagem.width, imagem.height))}
              >
                Voltar ao padrão
              </Botao>
            </div>
          </div>
        </div>
      )}
    </Janela>
  );
};

export default AjustarFoto;
