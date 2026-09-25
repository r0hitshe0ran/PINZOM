document
  .querySelectorAll("[data-year]")
  .forEach((el) => (el.textContent = new Date().getFullYear()));

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    const value = button.dataset.filter.toLowerCase();
    document.querySelectorAll("[data-category]").forEach((card) => {
      card.style.display =
        value === "all" || card.dataset.category === value ? "block" : "none";
    });
    document
      .querySelectorAll("[data-filter]")
      .forEach((b) => b.classList.remove("selected"));
    button.classList.add("selected");
  });
});

const categoryButtons = document.querySelectorAll(
  ".category-card[data-category]",
);
const categoryImages = document.querySelectorAll("[data-category-image]");

if (categoryButtons.length && categoryImages.length) {
  const validCategories = [...categoryButtons].map(
    (button) => button.dataset.category,
  );
  const requestedCategory = new URLSearchParams(window.location.search).get(
    "category",
  );

  function selectCategory(category) {
    const selectedCategory = validCategories.includes(category)
      ? category
      : "cakes";
    categoryButtons.forEach((button) => {
      const isSelected = button.dataset.category === selectedCategory;
      button.classList.toggle("is-active", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    categoryImages.forEach((image) =>
      image.classList.toggle(
        "is-visible",
        image.dataset.categoryImage === selectedCategory,
      ),
    );
  }

  categoryButtons.forEach((button) =>
    button.addEventListener("click", () =>
      selectCategory(button.dataset.category),
    ),
  );
  selectCategory(requestedCategory || "cakes");
}

document.querySelectorAll("form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    alert(
      "This is a demo page. Form submission is not connected to a database yet.",
    );
  });
});
