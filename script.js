document
  .querySelectorAll("[data-year]")
  .forEach((el) => (el.textContent = new Date().getFullYear()));

/* ==========================================================
   DATA + HELPERS
   ========================================================== */

//SMALL HELPERS
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function stars(count) {
  return "★".repeat(count) + "☆".repeat(5 - count);
}

function timeAgo(isoDate) {
  const seconds = (Date.now() - new Date(isoDate).getTime()) / 1000;
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + (hours === 1 ? " hour ago" : " hours ago");
  const days = Math.floor(hours / 24);
  if (days < 7) return days + (days === 1 ? " day ago" : " days ago");
  const weeks = Math.floor(days / 7);
  return weeks + (weeks === 1 ? " week ago" : " weeks ago");
}

// Same-origin requests to the local JSON server.
async function api(route, body) {
  const response = await fetch("api/" + route, body === undefined ? undefined : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Start Pinzom with node server.js to use account and review forms.");
  }

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message);
    error.field = data.field;
    throw error;
  }
  return data;
}

const pageParams = new URLSearchParams(window.location.search);
const loginLink = document.querySelector(".login-link");
let currentUser = null;
let savedReviews = [];

function setCurrentUser(user) {
  currentUser = user;
  loginLink.textContent = user ? "My profile" : "Log in";
  loginLink.href = user ? "profile.html" : "login.html";
}

const sessionReady = window.location.protocol === "file:"
  ? Promise.resolve()
  : api("session").then(({ user }) => setCurrentUser(user)).catch(() => {});

//TOAST MESSAGE (small popup instead of alert())
function showToast(message, linkText, linkHref) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = el("div", "toast");
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  if (linkText) {
    const link = el("a", "", linkText);
    link.href = linkHref;
    toast.append(" ", link);
  }
  toast.classList.add("show");
  clearTimeout(toast.hideTimer);
  toast.hideTimer = setTimeout(() => toast.classList.remove("show"), 4000);
}

/* ==========================================================
   HEADER (all pages)
   ========================================================== */

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

function setMenu(open) {
  navLinks.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  menuToggle.textContent = open ? "✕" : "☰";
}

menuToggle.addEventListener("click", () =>
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true"),
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navLinks.classList.contains("open")) {
    setMenu(false);
    menuToggle.focus();
  }
});

/* ==========================================================
   EXPLORE + REVIEWS PAGE FILTERING
   (category buttons and the search box now work together)
   ========================================================== */
const filterButtons = document.querySelectorAll("[data-filter]");
const searchBox = document.getElementById("searchBox");
const noResults = document.getElementById("noResults");
const exploreBakeries = document.getElementById("exploreBakeries");

function buildBakeryCard(bakery, showDistance = false) {
  const card = el("article", "card bakery");
  card.dataset.category = bakery.category;
  const href = "bakery.html?id=" + encodeURIComponent(bakery.id);

  const favorite = el("button", "fav-btn", "♡");
  favorite.type = "button";
  favorite.dataset.fav = bakery.id;
  favorite.setAttribute("aria-label", "Favorite " + bakery.name);
  card.append(favorite);

  if (bakery.image) {
    const imageLink = el("a", "card-link");
    imageLink.href = href;
    const frame = el("div", "bakery-image");
    const image = el("img");
    image.src = bakery.image;
    image.alt = bakery.name;
    image.loading = "lazy";
    frame.append(image);
    imageLink.append(frame);
    card.append(imageLink);
  } else {
    card.classList.add("bakery-text-card");
  }

  const title = el("h3");
  const link = el("a", "", bakery.name);
  link.href = href;
  title.append(link);
  card.append(title);

  const summary = el("div", "bakery-summary");
  if (bakery.rating) summary.append(el("span", "rating", "★ " + bakery.rating));
  if (showDistance) {
    const distance = el("span", "bakery-distance");
    distance.dataset.distance = bakery.id;
    distance.hidden = true;
    summary.append(distance);
  }
  card.append(summary, el("p", "", bakery.description));
  if (bakery.address) card.append(el("p", "bakery-address", bakery.address));
  return card;
}

if (exploreBakeries) {
  noResults.before(...BAKERIES.map((bakery) => buildBakeryCard(bakery, true)));
}

function selectFilterButton(button) {
  filterButtons.forEach((candidate) => {
    const selected = candidate === button;
    candidate.classList.toggle("selected", selected);
    candidate.setAttribute("aria-pressed", String(selected));
  });
}

function applyFilters() {
  const activeButton = document.querySelector("[data-filter].selected");
  const category = activeButton ? activeButton.dataset.filter.toLowerCase() : "all";
  const query = searchBox ? searchBox.value.trim().toLowerCase() : "";
  let visibleCount = 0;

  document
    .querySelectorAll(".bakery[data-category], .review-card[data-category]")
    .forEach((item) => {
      const text =
        [...item.querySelectorAll("h3, p, blockquote")].map((n) => n.textContent).join(" ") +
        " " +
        item.dataset.category;
      const matches =
        (category === "all" || item.dataset.category === category) &&
        text.toLowerCase().includes(query);
      item.hidden = !matches;
      if (matches) visibleCount++;
    });

  if (noResults) noResults.hidden = visibleCount > 0;
}

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectFilterButton(button);
    applyFilters();
  });
});
if (searchBox) searchBox.addEventListener("input", applyFilters);

if (filterButtons.length) {
  const initialFilter = [...filterButtons].find(
    (button) => button.dataset.filter === pageParams.get("category"),
  );
  selectFilterButton(initialFilter || filterButtons[0]);
  if (searchBox) searchBox.value = pageParams.get("q") || "";
  applyFilters();
}

/* ==========================================================
   FAVORITES (heart buttons on Explore + Bakery page)
   Saved inside the logged-in user's record in users.json
   ========================================================== */
async function toggleFavorite(bakeryId) {
  await sessionReady;
  if (!currentUser) {
    showToast("Please log in to save favorites.", "Log in", "login.html");
    return;
  }

  try {
    const { user, saved } = await api("favorites", { bakeryId });
    setCurrentUser(user);
    showToast(saved ? "Saved to your favorites." : "Removed from favorites.");
    document.dispatchEvent(new CustomEvent("favoritesChanged"));
  } catch (error) {
    showToast(error.message);
  }
}

function refreshFavoriteButtons() {
  const user = currentUser;
  document.querySelectorAll("[data-fav]").forEach((button) => {
    const saved = !!user && (user.favorites || []).includes(button.dataset.fav);
    const bakery = findCatalogBakery(button.dataset.fav);
    if (bakery && !("label" in button.dataset)) {
      button.setAttribute("aria-label", (saved ? "Remove " : "Save ") + bakery.name +
        (saved ? " from favorites" : " to favorites"));
    }
    const icon = saved ? "♥" : "♡";
    button.classList.toggle("is-saved", saved);
    button.setAttribute("aria-pressed", String(saved));
    button.textContent =
      "label" in button.dataset
        ? icon + " " + (saved ? "Saved to favorites" : "Save to favorites")
        : icon;
  });
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-fav]");
  if (!button || !button.dataset.fav || button.disabled) return;
  button.disabled = true;
  toggleFavorite(button.dataset.fav).finally(() => { button.disabled = false; });
});
document.addEventListener("favoritesChanged", refreshFavoriteButtons);
sessionReady.then(refreshFavoriteButtons);

/* ==========================================================
   FORM VALIDATION (signup, login, forgot password, review)
   ========================================================== */
const RULES = {
  fullName(value) {
    if (!value) return "Please enter your full name.";
    if (value.length < 2) return "Name must be at least 2 characters.";
    if (!/^\p{L}[\p{L}\p{M} .'-]*$/u.test(value))
      return "Name can only contain letters, spaces, . ' and -";
    return "";
  },
  email(value) {
    if (!value) return "Please enter your email address.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))
      return "Please enter a valid email, like you@campus.edu";
    return "";
  },
  newPassword(value) {
    if (!value) return "Please create a password.";
    if (value.length < 8 || !/[A-Za-z]/.test(value) || !/\d/.test(value))
      return "Use at least 8 characters, with a letter and a number.";
    return "";
  },
  confirmPassword(value, field) {
    if (!value) return "Please re-enter your new password.";
    if (value !== field.form.elements.password.value)
      return "Passwords do not match.";
    return "";
  },
  required(value) {
    return value ? "" : "Please fill in this field.";
  },
  terms(checked) {
    return checked ? "" : "You need to accept the Terms and Privacy Policy.";
  },
  reviewText(value) {
    if (!value) return "Please write a few words about your visit.";
    if (value.length < 10) return "Please write at least 10 characters.";
    return "";
  },
  rating(value) {
    return value ? "" : "Please choose a star rating.";
  },
};

function fieldValue(field) {
  if (field.type === "checkbox") return field.checked;
  if (field.type === "password" || field.name === "password" || field.name === "confirmPassword")
    return field.value;
  if ("value" in field && field.value !== undefined && field.tagName !== "DIV")
    return field.value.trim();
  return field.dataset.value || ""; //star rating group
}

function setFieldError(field, message) {
  const key = field.name || field.dataset.field;
  const form = field.form || field.closest("form");
  const errorBox = form
    ? form.querySelector('[data-error-for="' + key + '"]')
    : null;
  field.classList.toggle("invalid", !!message);
  field.setAttribute("aria-invalid", String(!!message));
  if (errorBox) {
    errorBox.id ||= "error-" + key;
    field.setAttribute("aria-describedby", errorBox.id);
    errorBox.textContent = message;
  }
}

function validateField(field) {
  const message = RULES[field.dataset.rule](fieldValue(field), field);
  setFieldError(field, message);
  return !message;
}

function validateForm(form) {
  let firstInvalid = null;
  form.querySelectorAll("[data-rule]").forEach((field) => {
    if (!validateField(field) && !firstInvalid) firstInvalid = field;
  });
  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

function showFormMessage(form, type, message, linkText, linkHref) {
  const box = form.querySelector(".form-msg");
  if (!box) return;
  box.className = "form-msg show " + type;
  box.textContent = message;
  if (linkText) {
    const link = el("a", "", linkText);
    link.href = linkHref;
    box.append(" ", link);
  }
}

function clearFormMessage(form) {
  const box = form.querySelector(".form-msg");
  if (box) {
    box.className = "form-msg";
    box.textContent = "";
  }
}

//SHOW / HIDE BUTTON ON PASSWORD FIELDS
document.querySelectorAll(".form input[type='password']").forEach((input) => {
  const wrap = el("div", "pw-wrap");
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);
  const toggle = el("button", "pw-toggle", "Show");
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Show password");
  toggle.addEventListener("click", () => {
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    toggle.textContent = hidden ? "Hide" : "Show";
    toggle.setAttribute("aria-label", hidden ? "Hide password" : "Show password");
  });
  wrap.appendChild(toggle);
});

/* ==========================================================
   FORM SUBMISSION HANDLERS
   ========================================================== */

async function handleSignup(form) {
  const fields = form.elements;
  const { user, recoveryCode } = await api("signup", {
    fullName: fields.fullName.value.trim(),
    email: fields.email.value.trim(),
    password: fields.password.value,
    acceptedTerms: fields.terms.checked,
  });
  setCurrentUser(user);
  form.reset();
  form.hidden = true;
  document.getElementById("recoveryCode").textContent = recoveryCode;
  const panel = document.getElementById("recoveryPanel");
  panel.hidden = false;
  panel.querySelector("a").focus();
}

async function handleLogin(form) {
  const fields = form.elements;
  const { user } = await api("login", {
    identifier: fields.identifier.value.trim(),
    password: fields.password.value,
  });
  setCurrentUser(user);
  const bakery = pageParams.get("reviewBakery");
  window.location.href = pageParams.has("reviewBakery")
    ? "reviews.html" + (bakery ? "?bakery=" + encodeURIComponent(bakery) : "")
    : "profile.html";
}

async function handleForgot(form) {
  const fields = form.elements;
  await api("reset-password", {
    email: fields.email.value.trim(),
    password: fields.password.value,
    recoveryCode: fields.recoveryCode.value.trim(),
  });
  setCurrentUser(null);
  form.reset();
  showFormMessage(form, "success", "Password updated.", "Log in →", "login.html");
}

function buildReviewCard(review) {
  const card = el("article", "review-card");
  card.dataset.category = review.category || "";

  const person = el("header", "reviewer");
  const avatar = el("span", "avatar", review.author.charAt(0).toUpperCase());
  avatar.setAttribute("aria-hidden", "true");
  const info = el("div");
  info.append(
    el("h2", "reviewer-name", review.author),
    el("p", "review-date", timeAgo(review.createdAt)),
  );
  person.append(avatar, info);

  const title = el("h3", "bakery-name", review.bakery);
  if (review.bakeryId) {
    const link = el("a", "", review.bakery);
    link.href = "bakery.html?id=" + encodeURIComponent(review.bakeryId);
    title.replaceChildren(link);
  }

  const rating = el("div", "stars", stars(review.rating));
  rating.setAttribute("aria-label", review.rating + " out of 5 stars");
  card.append(person, rating, title, el("blockquote", "", "“" + review.text + "”"));
  return card;
}

async function handleReview(form) {
  await sessionReady;
  const fields = form.elements;
  if (!currentUser) {
    const loginHref = "login.html?reviewBakery=" + encodeURIComponent(fields.bakeryId.value);
    showFormMessage(form, "error", "Please log in to post a review.", "Log in", loginHref);
    return;
  }

  await reviewsReady;
  const ratingGroup = form.querySelector(".star-input");
  const { review } = await api("reviews", {
    bakeryId: fields.bakeryId.value,
    rating: Number(ratingGroup.dataset.value),
    text: fields.text.value.trim(),
  });
  document.querySelector(".reviews").prepend(buildReviewCard(review));
  form.reset();
  ratingGroup.dataset.value = "";
  paintStars(ratingGroup, 0);
  const selected = document.querySelector("[data-filter].selected")?.dataset.filter;
  if (selected !== "all" && selected !== review.category) selectFilterButton(filterButtons[0]);
  applyFilters();
  showToast("Thanks! Your review has been posted.");
}

//ONE SUBMIT LISTENER FOR EVERY FORM (data-form="signup | login | forgot | review")
const formHandlers = {
  signup: handleSignup,
  login: handleLogin,
  forgot: handleForgot,
  review: handleReview,
};

document.querySelectorAll("form[data-form]").forEach((form) => {
  //re-check a field while typing once it has been flagged, and when leaving it
  form.addEventListener("input", (event) => {
    if (event.target.classList.contains("invalid")) validateField(event.target);
  });
  form.addEventListener("focusout", (event) => {
    const field = event.target;
    if (field.dataset && field.dataset.rule && fieldValue(field)) validateField(field);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (form.dataset.busy) return;
    clearFormMessage(form);
    if (!validateForm(form)) return;
    form.dataset.busy = "true";
    try {
      await formHandlers[form.dataset.form](form);
    } catch (error) {
      const field = form.elements[error.field];
      if (field && field instanceof HTMLElement) {
        setFieldError(field, error.message);
        field.focus();
      } else {
        showFormMessage(form, "error", error.message);
      }
    } finally {
      delete form.dataset.busy;
    }
  });
});

/* ==========================================================
   REVIEWS PAGE
   ========================================================== */
const reviewForm = document.querySelector("[data-form='review']");
const reviewsGrid = document.querySelector(".reviews");
const reviewsReady = (reviewsGrid || document.getElementById("bakeryContent") || document.getElementById("profileMain"))
  && window.location.protocol !== "file:"
  ? api("reviews").then(({ reviews }) => { savedReviews = reviews; }).catch(() => {})
  : Promise.resolve();

function paintStars(group, value, selected = value) {
  group.querySelectorAll(".star").forEach((star) => {
    const rating = Number(star.dataset.value);
    star.textContent = rating <= value ? "★" : "☆";
    star.setAttribute("aria-pressed", String(rating === selected));
  });
}

if (reviewForm && reviewsGrid) {
  reviewsReady.then(() => {
    savedReviews
      .filter((review) => review.bakeryId)
      .forEach((review) => reviewsGrid.prepend(buildReviewCard(review)));
    applyFilters();
  });

  const bakeryField = reviewForm.elements.bakeryId;
  for (const bakery of BAKERIES) {
    const option = el("option", "", bakery.name);
    option.value = bakery.id;
    bakeryField.appendChild(option);
  }

  const wantedBakery = findCatalogBakery(pageParams.get("bakery"))?.id || "";
  bakeryField.value = wantedBakery;
  sessionReady.then(() => {
    const notice = reviewForm.querySelector(".login-notice");
    const login = notice.querySelector("a");
    const updateLoginLink = () => {
      login.href = "login.html?reviewBakery=" + encodeURIComponent(bakeryField.value);
    };
    notice.hidden = !!currentUser;
    updateLoginLink();
    bakeryField.addEventListener("change", updateLoginLink);
  });

  const ratingGroup = reviewForm.querySelector(".star-input");
  ratingGroup.addEventListener("click", (event) => {
    const star = event.target.closest(".star");
    if (!star) return;
    ratingGroup.dataset.value = star.dataset.value;
    paintStars(ratingGroup, Number(star.dataset.value));
    validateField(ratingGroup);
  });
  ratingGroup.addEventListener("mouseover", (event) => {
    const star = event.target.closest(".star");
    if (star) paintStars(ratingGroup, Number(star.dataset.value), Number(ratingGroup.dataset.value));
  });
  ratingGroup.addEventListener("mouseleave", () =>
    paintStars(ratingGroup, Number(ratingGroup.dataset.value)),
  );
}

/* ==========================================================
   BAKERY PAGE (bakery.html?id=...)
   ========================================================== */
const bakeryContent = document.getElementById("bakeryContent");
if (bakeryContent) {
  const bakeryId = new URLSearchParams(window.location.search).get("id");
  const bakery = BAKERIES.find((b) => b.id === bakeryId);

  if (!bakery) {
    document.getElementById("bakeryMissing").hidden = false;
    document.getElementById("bakeryReviewsSection").hidden = true;
  } else {
    document.title = bakery.name + " | Pinzom";
    const image = document.getElementById("bakeryImage");
    const visual = image.closest(".visual");
    visual.hidden = !bakery.image;
    if (bakery.image) {
      image.src = bakery.image;
      image.alt = bakery.name;
    }
    document.getElementById("bakeryCategory").textContent =
      bakery.category === "cafes" ? "Cafés" :
        bakery.category.charAt(0).toUpperCase() + bakery.category.slice(1);
    document.getElementById("bakeryName").textContent = bakery.name;
    const rating = document.getElementById("bakeryRating");
    rating.hidden = !bakery.rating;
    if (bakery.rating) rating.textContent = "★ " + bakery.rating;
    bakeryContent.querySelector("[data-distance]").dataset.distance = bakery.id;
    document.getElementById("bakeryDescription").textContent = bakery.description;
    const address = document.getElementById("bakeryAddress");
    address.textContent = bakery.address || bakery.mapsDestination || "";
    address.hidden = !address.textContent;
    const website = document.getElementById("bakeryWebsite");
    if (bakery.website) {
      website.href = bakery.website;
      website.hidden = false;
    }
    document.getElementById("favoriteButton").dataset.fav = bakery.id;
    const reviewHref = "reviews.html?bakery=" + encodeURIComponent(bakery.id);
    document.getElementById("reviewLink").href = reviewHref;
    document.getElementById("firstReviewLink").href = reviewHref;
    document.getElementById("directionsLink").href =
      "https://www.google.com/maps/dir/?api=1&destination=" +
      encodeURIComponent(bakery.mapsDestination || bakery.name + ", " + bakery.address);
    bakeryContent.hidden = false;
    refreshFavoriteButtons();

    reviewsReady.then(() => {
      //reviews that visitors saved for this bakery
      const list = document.getElementById("bakeryReviews");
      const saved = savedReviews
        .filter((r) => r.bakeryId === bakery.id)
        .reverse();
      document.getElementById("bakeryReviewCount").textContent = saved.length
        ? "Reviews (" + saved.length + ")"
        : "Reviews";
      saved.forEach((r) => {
        const card = el("article", "card review-card");
        card.append(
          el("h4", "", r.author),
          el("div", "rating", stars(r.rating)),
          el("p", "", "“" + r.text + "”"),
          el("span", "review-meta", timeAgo(r.createdAt)),
        );
        list.appendChild(card);
      });
      document.getElementById("noBakeryReviews").hidden = saved.length > 0;
    });
  }
}

/* ==========================================================
   PROFILE PAGE
   ========================================================== */
const profileMain = document.getElementById("profileMain");
if (profileMain) Promise.all([sessionReady, reviewsReady]).then(() => {
  const user = currentUser;
  document.getElementById("profileGuest").hidden = !!user;
  profileMain.hidden = !user;

  if (user) {
    document.getElementById("profileTitle").textContent =
      "Hi, " + user.fullName.split(" ")[0];
    document.getElementById("profileName").textContent = user.fullName;
    document.getElementById("profileEmail").textContent = user.email;
    document.getElementById("profileSince").textContent = new Date(
      user.createdAt,
    ).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

    // Saved bakeries and reviews from the signed-in account.
    const renderProfileData = () => {
      const fresh = currentUser;
      const favList = document.getElementById("favoriteList");
      favList.replaceChildren();
      const favorites = BAKERIES.filter((b) => (fresh.favorites || []).includes(b.id));
      favList.append(...favorites.map((bakery) => buildBakeryCard(bakery)));
      document.getElementById("noFavorites").hidden = favorites.length > 0;

      const myReviews = savedReviews
        .filter((r) => r.userId === fresh.id)
        .reverse();
      const reviewList = document.getElementById("myReviewList");
      reviewList.replaceChildren();
      myReviews.forEach((r) => {
        const card = el("article", "card review-card");
        const title = el("h4");
        if (r.bakeryId) {
          const link = el("a", "", r.bakery);
          link.href = "bakery.html?id=" + r.bakeryId;
          title.appendChild(link);
        } else {
          title.textContent = r.bakery;
        }
        card.append(
          title,
          el("div", "rating", stars(r.rating)),
          el("p", "", "“" + r.text + "”"),
          el("span", "review-meta", timeAgo(r.createdAt)),
        );
        if (!r.bakeryId) {
          card.append(el("p", "review-meta", "This bakery is outside the current Explore catalog."));
        }
        reviewList.appendChild(card);
      });
      document.getElementById("noMyReviews").hidden = myReviews.length > 0;

      refreshFavoriteButtons();
    };
    renderProfileData();
    document.addEventListener("favoritesChanged", renderProfileData);

    document.getElementById("logoutButton").addEventListener("click", async () => {
      try {
        await api("logout", {});
        setCurrentUser(null);
        window.location.href = "login.html";
      } catch (error) {
        showToast(error.message);
      }
    });
  }
});

/* ==========================================================
   CATEGORY PAGE BUTTONS
   ========================================================== */
const categoryButtons = document.querySelectorAll(
  ".category-card[data-category]",
);
const categoryImages = document.querySelectorAll("[data-category-image]");
const categoryExploreLink = document.getElementById("categoryExploreLink");

if (categoryButtons.length && categoryImages.length) {
  categoryButtons.forEach((button) => {
    const count = BAKERIES.filter((bakery) => bakery.category === button.dataset.category).length;
    const label = button.dataset.category === "cafes" ? "cafés" : count === 1 ? "bakery" : "bakeries";
    button.querySelector(".count").textContent = count + " " + label;
  });
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
    if (categoryExploreLink) {
      categoryExploreLink.href = "explore.html?category=" + selectedCategory;
      categoryExploreLink.textContent = "Explore " + (selectedCategory === "cafes" ? "cafés" : selectedCategory) + " →";
    }
  }

  categoryButtons.forEach((button) =>
    button.addEventListener("click", () =>
      selectCategory(button.dataset.category),
    ),
  );
  selectCategory(requestedCategory || "cakes");
}

function distanceInKilometres(from, to) {
  const radians = Math.PI / 180;
  const latitude = (to.latitude - from.latitude) * radians;
  const longitude = (to.longitude - from.longitude) * radians;
  const halfChord =
    Math.sin(latitude / 2) ** 2 +
    Math.cos(from.latitude * radians) * Math.cos(to.latitude * radians) *
    Math.sin(longitude / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(Math.min(1, halfChord)));
}

const locationControl = document.querySelector("[data-location-control]");
if (locationControl) {
  const button = locationControl.querySelector("[data-use-location]");
  const status = locationControl.querySelector("[data-location-status]");
  const distances = [...document.querySelectorAll("[data-distance]")]
    .filter((node) => node.dataset.distance)
    .map((node) => ({ node, coordinates: findCatalogBakery(node.dataset.distance)?.coordinates }));
  const available = distances.filter(({ coordinates }) => coordinates);

  if (!available.length) {
    button.hidden = true;
    if (distances.length) status.textContent = "Distance unavailable for this bakery.";
  } else {
    button.addEventListener("click", () => {
      if (!window.isSecureContext) {
        status.textContent = "Location access requires localhost or a secure connection.";
        return;
      }
      if (!navigator.geolocation) {
        status.textContent = "This browser doesn’t support location access.";
        return;
      }
      button.disabled = true;
      status.textContent = "Getting your location…";
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        for (const { node, coordinates } of distances) {
          if (coordinates) {
            const km = distanceInKilometres(coords, coordinates);
            const amount = km < 0.1 ? "Less than 0.1" : km.toFixed(km < 10 ? 1 : 0);
            node.textContent = amount + " km away";
          } else {
            node.textContent = "Distance unavailable";
          }
          node.hidden = false;
        }
        status.textContent = "Distance estimates follow the shortest direct path.";
        button.textContent = "Update my location";
        button.disabled = false;
      }, (error) => {
        for (const { node } of distances) node.hidden = true;
        status.textContent = error.code === 1
          ? "Location access is blocked. Allow it in your browser’s site settings and try again."
          : "Couldn’t get your location. Try again.";
        button.textContent = "Use my location";
        button.disabled = false;
      }, { timeout: 10000 });
    });
  }
}

// Assemble the dessert layers as the page scrolls.
if (document.body.classList.contains("page-home") &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const stages = [...document.querySelectorAll(".split-stage")].map((stage) => ({
    stage,
    layers: [...stage.querySelectorAll("[data-shift]")],
    originalWidth: stage.classList.contains("pastry-stage") ? 941 : 1122,
  }));
  let framePending = false;

  function animateDesserts() {
    framePending = false;
    const viewportHeight = window.innerHeight;
    const start = viewportHeight * 0.94;
    const end = viewportHeight * 0.24;

    for (const { stage, layers, originalWidth } of stages) {
      const { top, width } = stage.getBoundingClientRect();
      const progress = Math.min(1, Math.max(0, (start - top) / (start - end)));
      const eased = progress * progress * (3 - 2 * progress);
      const separation = (1 - eased) * 2.4 * width / originalWidth;
      for (const layer of layers) {
        layer.style.transform = "translateY(" + Number(layer.dataset.shift) * separation + "px)";
      }
    }
  }

  function scheduleDesserts() {
    if (framePending) return;
    framePending = true;
    requestAnimationFrame(animateDesserts);
  }

  animateDesserts();
  window.addEventListener("scroll", scheduleDesserts, { passive: true });
  window.addEventListener("resize", scheduleDesserts);
  window.addEventListener("load", scheduleDesserts);
}
