/* ============================================
   MATERIAL — validação e envio do formulário
   ============================================ */

(function () {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB

  const form = document.getElementById('submit-form');
  if (!form) return;

  const fileInput  = form.querySelector('#arquivo');
  const fileInfo   = form.querySelector('#file-info');
  const message    = form.querySelector('#form-message');
  const submitBtn  = form.querySelector('#submit-btn');
  const submitText = form.querySelector('#submit-text');

  const showMessage = (tipo, texto) => {
    message.textContent = texto;
    message.classList.remove('form__message--hidden', 'form__message--success', 'form__message--error');
    message.classList.add(tipo === 'sucesso' ? 'form__message--success' : 'form__message--error');
  };

  const hideMessage = () => {
    message.classList.add('form__message--hidden');
  };

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) {
      fileInfo.textContent = '';
      return;
    }

    if (file.type !== 'application/pdf') {
      showMessage('erro', '⚠️ Por favor, envie apenas arquivos PDF!');
      fileInput.value = '';
      fileInfo.textContent = '';
      return;
    }

    if (file.size > MAX_SIZE) {
      showMessage('erro', '⚠️ O arquivo deve ter no máximo 10MB!');
      fileInput.value = '';
      fileInfo.textContent = '';
      return;
    }

    hideMessage();
    fileInfo.innerHTML = `✅ Arquivo selecionado: <strong>${file.name}</strong>`;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    if (!data.get('nomeAluno') || !data.get('emailAluno') || !data.get('nomeAtividade') || !data.get('arquivo')?.size) {
      showMessage('erro', '⚠️ Por favor, preencha todos os campos!');
      return;
    }

    submitBtn.disabled = true;
    submitText.innerHTML = '<span class="form__spinner" aria-hidden="true"></span>Enviando...';

    try {
      // TODO: integração com backend
      await new Promise(resolve => setTimeout(resolve, 1500));

      showMessage('sucesso', '✅ Atividade enviada com sucesso! Você receberá um email de confirmação.');
      form.reset();
      fileInfo.textContent = '';
    } catch (error) {
      console.error(error);
      showMessage('erro', '❌ Erro ao enviar atividade. Tente novamente mais tarde.');
    } finally {
      submitBtn.disabled = false;
      submitText.textContent = '📤 Enviar Atividade';
    }
  });
})();
