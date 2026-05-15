/* ============================================
   RECONHECIMENTOS: modal de imagem ampliada
   ============================================ */

(function () {
  const modal = document.getElementById("image-modal");
  if (!modal) return;

  const closeBtn = modal.querySelector(".image-modal__close");
  const modalImg = modal.querySelector(".image-modal__placeholder img");

  const open = (event) => {
    const src = event.currentTarget.getAttribute("data-modal-src");
    if (src) {
      modalImg.src = src;
    }
    modal.setAttribute("open", "");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    modal.removeAttribute("open");
    document.body.style.overflow = "";
  };

  document.querySelectorAll("[data-open-modal]").forEach((el) => {
    el.addEventListener("click", open);
  });

  closeBtn.addEventListener("click", close);
  modal.addEventListener("click", (event) => {
    if (event.target === modal) close();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.hasAttribute("open")) close();
  });
})();
