/**
 * ============================================
 * COMPONENTE MACRO TIMELINE (CRONOGRAMA)
 * ============================================
 *
 * Exibe o cronograma macro do projeto de forma visual.
 *
 * Funcionalidades:
 * - Timeline vertical com eventos
 * - Linha azul horizontal conectando os eventos
 * - Linhas verdes verticais para cada evento
 * - Layout responsivo para desktop e mobile
 *
 * Estrutura:
 * - Eventos superiores e inferiores conectados por linha verde
 * - Círculo verde central na linha azul
 * - Círculos brancos nas extremidades
 */

const MacroTimeline = () => {
  const timelineEvents = [
    {
      titleTop: 'Início das divulgações',
      dateTop: '29/05',
      titleBottom: 'Pré-inscrições para as oficinas',
      dateBottom: '26/05',
    },
    {
      titleTop: 'Oficina Mundo Tech',
      dateTop: '18/06',
      titleBottom: 'Oficina Developer na Prática',
      dateBottom: '11/06',
    },
    {
      titleTop: 'Oficina ChatBot e IA',
      dateTop: '25/06',
      titleBottom: 'Inscrições FavelaWare',
      dateBottom: '25/06',
    },
    {
      titleTop: 'Início das aulas',
      dateTop: '05/08',
      titleBottom: '',
      dateBottom: '05/08',
    },
    {
      titleTop: 'Formatura',
      dateTop: '01/08/26',
      titleBottom: '',
      dateBottom: '01/08/26',
    },
  ];

  return (
    <div className="w-full bg-[#f5f6fa] py-10 px-4">
      <div className="max-w-6xl mx-auto my-10 bg-white rounded-3xl shadow-lg px-4 sm:px-10 py-6 sm:py-8">
        {/* Cabeçalho do card */}
        <div className="relative mb-10">
          {/* Legenda no canto superior esquerdo */}
          <div className="flex items-center gap-[6px] mb-2">
            <div className="w-2 h-2 rounded-sm bg-[#8BC53F]"></div>
            <div className="w-3 h-3 rounded-sm bg-[#25255c]"></div>
          </div>

          {/* Título centralizado */}
          <h2 className="text-2xl sm:text-3xl font-semibold italic text-[#25255c] text-center mt-2">
            Cronograma Macro
          </h2>
        </div>

        {/* Timeline Container */}
        <div className="relative mt-4 px-2">
          {/* Container com altura fixa para posicionamento absoluto */}
          <div className="relative h-[400px] sm:h-[450px]">
            {/* Linha horizontal azul - posicionada absolutamente */}
            <div className="absolute inset-x-0 top-[180px] sm:top-[200px] h-[4px] bg-[#25255c] rounded-full z-0"></div>

            {/* Container dos eventos */}
            <div className="relative h-full flex justify-between">
              {/* Eventos */}
              {timelineEvents.map((event, index) => (
                <div key={index} className="flex-1 flex flex-col items-center relative">
                  {/* Wrapper com altura total */}
                  <div className="relative h-full flex flex-col items-center">
                    {/* Parte superior - textos */}
                    <div className="flex flex-col items-center text-center mb-3">
                      <p className="text-xs sm:text-sm text-slate-700 leading-tight mb-1 max-w-[80px] sm:max-w-[100px]">
                        {event.titleTop}
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-[#25255c]">{event.dateTop}</p>
                    </div>

                    {/* Container central com linha verde e círculos */}
                    <div className="relative flex flex-col items-center">
                      {/* Linha vertical verde contínua */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-[220px] sm:h-[260px] bg-[#8BC53F] z-5"></div>

                      {/* Círculo branco superior */}
                      <div className="relative w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full border border-gray-100 shadow-md z-10 mb-[72px] sm:mb-[84px]"></div>

                      {/* Círculo verde central - sobre a linha azul */}
                      <div className="relative w-7 h-7 sm:w-9 sm:h-9 bg-[#8BC53F] rounded-full border-2 border-white shadow-lg z-20 mb-[72px] sm:mb-[84px]"></div>

                      {/* Círculo branco inferior */}
                      <div className="relative w-5 h-5 sm:w-6 sm:h-6 bg-white rounded-full border border-gray-100 shadow-md z-10"></div>
                    </div>

                    {/* Parte inferior - textos */}
                    <div className="flex flex-col items-center text-center mt-3">
                      {event.titleBottom && (
                        <p className="text-xs sm:text-sm text-slate-700 leading-tight mb-1 max-w-[80px] sm:max-w-[100px]">
                          {event.titleBottom}
                        </p>
                      )}
                      <p className="text-xs sm:text-sm font-semibold text-[#25255c]">{event.dateBottom}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroTimeline;
