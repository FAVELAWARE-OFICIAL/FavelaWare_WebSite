# Entregas no Google Drive (Apps Script)

Os arquivos que os alunos entregam no portal ficam no **Google Drive da ONG**, não
no Supabase (o espaço lá é limitado). O caminho é:

```
Portal (aluno) ──► Edge Function "entregas-drive" (Supabase) ──► Apps Script ──► Google Drive
```

- O Apps Script só aceita pedidos **assinados** (HMAC) com um segredo que só ele e
  o Supabase conhecem. Sem a assinatura, nada é gravado, lido ou apagado.
- As pastas usam só números (`turma_5/atividade_12/37-<código>.pdf`): nenhum nome
  de aluno vai para o Drive.
- Professor e aluno abrem os arquivos pelo portal, que confere quem pode ver cada
  entrega. A pasta pode ser compartilhada só com pessoas convidadas por e-mail.

## Configurar (uma vez, ~10 minutos)

Use uma **conta Google da ONG** (não pessoal), com verificação em duas etapas.

1. **Pasta:** no Drive, crie a pasta `FavelaWare · Entregas`. Abra a pasta e copie o
   id do endereço: `https://drive.google.com/drive/folders/`**`ESTE_PEDAÇO`**.

   ⚠️ A pasta guarda arquivos de alunos menores de idade. Pode compartilhar com
   pessoas **convidadas por e-mail** (equipe, parceiros), mas **nunca** use
   "Qualquer pessoa com o link": se isso acontecer, o script para de funcionar de
   propósito até o "Acesso geral" voltar para **Restrito**. Quem tiver acesso à pasta
   vê todas as entregas: peça que usem verificação em duas etapas.
2. **Script:** acesse https://script.google.com → **Novo projeto** → apague o que
   vier e cole todo o conteúdo de `entregas.gs`. Dê o nome `FavelaWare Entregas` e salve.
3. **Propriedades:** no menu da esquerda, ⚙️ **Configurações do projeto** →
   **Propriedades do script** → adicione:
   | Propriedade | Valor |
   | --- | --- |
   | `SEGREDO` | o conteúdo do arquivo `google-apps-script/.segredo` (64 letras e números) |
   | `PASTA_RAIZ_ID` | o id da pasta do passo 1 |

   Depois de colar o segredo, **apague o arquivo `.segredo`** do computador.
4. **Implantar:** botão **Implantar** → **Nova implantação** → tipo **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**

   Clique em **Implantar**, autorize o acesso ao Drive e copie a **URL do app da Web**
   (termina em `/exec`).
5. **Ligar ao Supabase:** no terminal, na pasta do projeto:
   ```
   npx supabase secrets set --project-ref ymhxibapfrvzsojdxiql DRIVE_WEBAPP_URL=<a URL do passo 4>
   ```

Pronto: o envio de arquivo no portal passa a gravar no Drive.

## Se precisar mudar o script

Edite, salve e use **Implantar → Gerenciar implantações → ✏️ → Nova versão**. Assim a
URL `/exec` continua a mesma (uma "Nova implantação" gera outra URL, e aí é preciso
repetir o passo 5).

## Trocar o segredo (se vazar)

```
openssl rand -hex 32
```
Coloque o novo valor na propriedade `SEGREDO` do script **e** em
`npx supabase secrets set --project-ref ymhxibapfrvzsojdxiql DRIVE_HMAC_SEGREDO=<novo>`.

## Se o Drive estiver fora do ar

O portal avisa "Envio de arquivo indisponível agora" e o aluno pode entregar com
link ou texto. Se for perto do prazo, o professor pode estender o prazo da atividade.

## Limites (gratuitos)

- 10 MB por arquivo (regra do portal).
- Apps Script: até 30 execuções ao mesmo tempo e 6 minutos cada. Muitos alunos
  enviando no mesmo segundo podem ter de tentar de novo.
- Espaço: o do Google Drive da conta da ONG (15 GB na conta gratuita).
