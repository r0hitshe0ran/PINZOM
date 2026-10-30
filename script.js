document
  .querySelectorAll("[data-year]")
  .forEach((el) => (el.textContent = new Date().getFullYear()));

/* ==========================================================
   DATA + HELPERS
   ========================================================== */

//BAKERY DATA (the same six bakeries that are shown on the Explore page)
const BAKERIES = [
  {
    id: "fifth-avenue-cafe-bakery",
    name: "Fifth Avenue Cafe & Bakery",
    category: "cakes",
    rating: 4.7,
    distance: "1.36 km away",
    description: "Fresh cakes and desserts.",
    image: "images/1_Explorepage.png",
  },
  {
    id: "la-vie-douce",
    name: "La Vie Douce",
    category: "pastries",
    rating: 4.6,
    distance: "0.38 km away",
    description: "Buttery pastries and coffee.",
    image: "images/2_Explorepage.png",
  },
  {
    id: "krispy-kreme",
    name: "Krispy Kreme",
    category: "donuts",
    rating: 4.8,
    distance: "0.24 km away",
    description: "Glazed and filled donuts.",
    image: "images/3_Explorepage.png",
  },
  {
    id: "dwija-bake-studio",
    name: "Dwija Bake Studio",
    category: "cookies",
    rating: 4.8,
    distance: "0.23 km away",
    description: "Cookies and baked treats.",
    image: "images/4 (2).png",
  },
  {
    id: "sugar-and-rye",
    name: "Sugar & Rye",
    category: "cakes",
    rating: 4.8,
    distance: "0.52 km away",
    description: "Celebration cakes and desserts.",
    image: "images/5_Explorepage.png",
  },
  {
    id: "campus-bakehouse",
    name: "Campus Bakehouse",
    category: "pastries",
    rating: 4.7,
    distance: "0.71 km away",
    description: "Fresh bakes and coffee.",
    image: "images/6_Explorepage.png",
  },
];

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

function findBakeryByName(name) {
  const wanted = name.trim().toLowerCase();
  return BAKERIES.find((b) => b.name.toLowerCase() === wanted) || null;
}

//SAVING FORM DATA AS JSON
//Every form saves its data as JSON text (users / reviews). The browser keeps it
//between pages and visits, and "Download" gives a real .json file.
//(Writing to a file on the server comes later, with Express in the 3rd evaluation.)
const KEYS = {
  users: "pinzom_users",
  reviews: "pinzom_reviews",
  session: "pinzom_session",
};

const Store = {
  read(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch {
      return [];
    }
  },
  write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data, null, 2));
      return true;
    } catch {
      return false;
    }
  },
};

function downloadJSON(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

//Passwords are stored as a hash, never as plain text.
async function hashPassword(password) {
  if (window.crypto && crypto.subtle) {
    const bytes = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let hash = 5381; //simple fallback when crypto.subtle is not available
  for (const char of password) hash = (hash * 33) ^ char.charCodeAt(0);
  return "x" + (hash >>> 0).toString(16);
}

//LOGGED-IN USER (session)
function getSession() {
  try {
    return localStorage.getItem(KEYS.session);
  } catch {
    return null;
  }
}
function setSession(email) {
  try {
    localStorage.setItem(KEYS.session, email);
  } catch {}
}
function clearSession() {
  try {
    localStorage.removeItem(KEYS.session);
  } catch {}
}
function getCurrentUser() {
  const email = getSession();
  if (!email) return null;
  return Store.read(KEYS.users).find((u) => u.email === email) || null;
}
function saveUser(user) {
  const users = Store.read(KEYS.users).map((u) => (u.id === user.id ? user : u));
  return Store.write(KEYS.users, users);
}
function redirectTo(page) {
  setTimeout(() => (window.location.href = page), 900);
}

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

//LOGIN LINK SHOWS THE USER'S NAME WHEN LOGGED IN
const loginLink = document.querySelector(".login-link");
const loggedInUser = getCurrentUser();
if (loginLink && loggedInUser) {
  loginLink.textContent = loggedInUser.fullName.split(" ")[0];
  loginLink.href = "profile.html";
  loginLink.title = "Your profile";
}

//MOBILE MENU BUTTON
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });
}

/* ==========================================================
   EXPLORE + REVIEWS PAGE FILTERING
   (category buttons and the search box now work together)
   ========================================================== */
const filterButtons = document.querySelectorAll("[data-filter]");
const searchBox = document.getElementById("searchBox");
const noResults = document.getElementById("noResults");

function selectFilterButton(button) {
  filterButtons.forEach((b) => b.classList.remove("selected"));
  button.classList.add("selected");
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
        [...item.querySelectorAll("h3, p")].map((n) => n.textContent).join(" ") +
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

//HEADER SEARCH BOX: press Enter to search bakeries
const headerSearch = document.querySelector(".nav .search");
if (headerSearch) {
  headerSearch.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const query = headerSearch.value.trim();
    if (searchBox) {
      searchBox.value = query;
      applyFilters();
    } else {
      window.location.href =
        "explore.html" + (query ? "?q=" + encodeURIComponent(query) : "");
    }
  });
}

//OPENING EXPLORE FROM ANOTHER PAGE (?category=cakes&q=rye)
if (searchBox) {
  const params = new URLSearchParams(window.location.search);
  const wantedCategory = params.get("category");
  const wantedButton = [...filterButtons].find(
    (b) => b.dataset.filter === wantedCategory,
  );
  if (wantedButton) selectFilterButton(wantedButton);
  if (params.get("q")) {
    searchBox.value = params.get("q");
    if (headerSearch) headerSearch.value = params.get("q");
  }
}
applyFilters();

/* ==========================================================
   FAVORITES (heart buttons on Explore + Bakery page)
   Saved inside the logged-in user's record in users.json
   ========================================================== */
function toggleFavorite(bakeryId) {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in to save favorites.", "Log in", "login.html");
    return;
  }
  user.favorites = user.favorites || [];
  const index = user.favorites.indexOf(bakeryId);
  if (index === -1) user.favorites.push(bakeryId);
  else user.favorites.splice(index, 1);
  saveUser(user);
  showToast(index === -1 ? "Saved to your favorites." : "Removed from favorites.");
  document.dispatchEvent(new CustomEvent("favoritesChanged"));
}

function refreshFavoriteButtons() {
  const user = getCurrentUser();
  document.querySelectorAll("[data-fav]").forEach((button) => {
    const saved = !!user && (user.favorites || []).includes(button.dataset.fav);
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
  if (button) toggleFavorite(button.dataset.fav);
});
document.addEventListener("favoritesChanged", refreshFavoriteButtons);
refreshFavoriteButtons();

/* ==========================================================
   FORM VALIDATION (signup, login, forgot password, review)
   ========================================================== */
const RULES = {
  fullName(value) {
    if (!value) return "Please enter your full name.";
    if (value.length < 2) return "Name must be at least 2 characters.";
    if (!/^\p{L}[\p{L} .'-]*$/u.test(value))
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
  required(value, field) {
    return value ? "" : "Please fill in this field.";
  },
  terms(checked) {
    return checked ? "" : "You need to accept the Terms and Privacy Policy.";
  },
  bakery(value) {
    if (!value) return "Please tell us which bakery you are reviewing.";
    if (value.length < 2) return "Bakery name is too short.";
    return "";
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
  if (errorBox) errorBox.textContent = message;
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

//SIGN UP -> adds a user to users.json
async function handleSignup(form) {
  const f = form.elements;
  const email = f.email.value.trim().toLowerCase();
  const users = Store.read(KEYS.users);
  if (users.some((u) => u.email === email)) {
    setFieldError(f.email, "An account with this email already exists.");
    f.email.focus();
    return;
  }
  const user = {
    id: "u" + Date.now(),
    fullName: f.fullName.value.trim().replace(/\s+/g, " "),
    email,
    passwordHash: await hashPassword(f.password.value),
    acceptedTerms: true,
    favorites: [],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  if (!Store.write(KEYS.users, users)) {
    showFormMessage(form, "error", "Could not save your account in this browser.");
    return;
  }
  setSession(user.email);
  showFormMessage(form, "success", "Account created! Taking you to your profile…");
  redirectTo("profile.html");
}

//LOG IN -> checks the saved users
async function handleLogin(form) {
  const f = form.elements;
  const id = f.identifier.value.trim().toLowerCase();
  const user = Store.read(KEYS.users).find(
    (u) => u.email === id || u.fullName.toLowerCase() === id,
  );
  if (!user) {
    showFormMessage(form, "error", "No account found for that email or username.", "Sign up", "signup.html");
    return;
  }
  if (user.passwordHash !== (await hashPassword(f.password.value))) {
    showFormMessage(form, "error", "Incorrect password. Please try again.");
    return;
  }
  setSession(user.email);
  showFormMessage(form, "success", "Welcome back, " + user.fullName.split(" ")[0] + "! Taking you to your profile…");
  redirectTo("profile.html");
}

//FORGOT PASSWORD -> updates the saved password (no email is sent in this demo)
async function handleForgot(form) {
  const f = form.elements;
  const email = f.email.value.trim().toLowerCase();
  const users = Store.read(KEYS.users);
  const user = users.find((u) => u.email === email);
  if (!user) {
    setFieldError(f.email, "No account found with this email.");
    f.email.focus();
    return;
  }
  user.passwordHash = await hashPassword(f.password.value);
  user.updatedAt = new Date().toISOString();
  if (!Store.write(KEYS.users, users)) {
    showFormMessage(form, "error", "Could not save the new password in this browser.");
    return;
  }
  form.reset();
  showFormMessage(form, "success", "Password updated.", "Log in →", "login.html");
}

//REVIEW -> adds a review to reviews.json and shows it on the page
function buildReviewCard(review) {
  const card = el("article", "card review-card");
  card.dataset.category = review.category || "";

  const person = el("div", "review-person");
  person.append(el("span", "review-avatar", review.author.charAt(0).toUpperCase()));
  const info = el("div");
  info.append(el("strong", "", review.author), el("small", "", timeAgo(review.createdAt)));
  person.append(info);

  const title = el("h3");
  if (review.bakeryId) {
    const link = el("a", "", review.bakery);
    link.href = "bakery.html?id=" + review.bakeryId;
    title.append(link);
  } else {
    title.textContent = review.bakery;
  }

  card.append(
    person,
    el("div", "rating", stars(review.rating)),
    title,
    el("p", "", "“" + review.text + "”"),
  );
  return card;
}

function handleReview(form) {
  const user = getCurrentUser();
  if (!user) {
    showFormMessage(form, "error", "Please log in to post a review.", "Log in", "login.html");
    return;
  }
  const f = form.elements;
  const ratingGroup = form.querySelector(".star-input");
  const bakeryName = f.bakery.value.trim();
  const match = findBakeryByName(bakeryName);
  const review = {
    id: "r" + Date.now(),
    bakeryId: match ? match.id : null,
    bakery: match ? match.name : bakeryName,
    category: match ? match.category : "",
    rating: Number(ratingGroup.dataset.value),
    text: f.text.value.trim(),
    author: user.fullName,
    email: user.email,
    createdAt: new Date().toISOString(),
  };
  const reviews = Store.read(KEYS.reviews);
  reviews.push(review);
  if (!Store.write(KEYS.reviews, reviews)) {
    showFormMessage(form, "error", "Could not save your review in this browser.");
    return;
  }
  document.querySelector(".reviews-grid").prepend(buildReviewCard(review));
  form.reset();
  paintStars(ratingGroup, 0);
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
    } finally {
      delete form.dataset.busy;
    }
  });
});

//GOOGLE BUTTON (not connected yet)
document.querySelectorAll("[data-google]").forEach((button) => {
  button.addEventListener("click", () =>
    showFormMessage(
      button.form,
      "info",
      "Google sign-in isn't available yet. Please use your email and password.",
    ),
  );
});

/* ==========================================================
   REVIEWS PAGE
   ========================================================== */
function paintStars(group, value) {
  group.querySelectorAll(".star").forEach((star) => {
    const filled = Number(star.dataset.value) <= value;
    star.textContent = filled ? "★" : "☆";
    star.setAttribute("aria-checked", String(Number(star.dataset.value) === value));
  });
}

const reviewForm = document.querySelector("[data-form='review']");
const reviewsGrid = document.querySelector(".reviews-grid");
if (reviewForm && reviewsGrid) {
  //show reviews saved earlier (newest first)
  Store.read(KEYS.reviews).forEach((review) =>
    reviewsGrid.prepend(buildReviewCard(review)),
  );

  //bakery name suggestions
  const options = document.getElementById("bakeryOptions");
  if (options)
    BAKERIES.forEach((b) => {
      const option = document.createElement("option");
      option.value = b.name;
      options.appendChild(option);
    });

  //?bakery=La Vie Douce pre-fills the form (link from a bakery page)
  const wantedBakery = new URLSearchParams(window.location.search).get("bakery");
  if (wantedBakery) reviewForm.elements.bakery.value = wantedBakery;

  //star rating
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
    if (star) paintStars(ratingGroup, Number(star.dataset.value));
  });
  ratingGroup.addEventListener("mouseleave", () =>
    paintStars(ratingGroup, Number(ratingGroup.dataset.value || 0)),
  );

  if (!getCurrentUser())
    showFormMessage(reviewForm, "info", "Log in to post your own review.", "Log in", "login.html");
  applyFilters();
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
    image.src = bakery.image;
    image.alt = bakery.name;
    document.getElementById("bakeryCategory").textContent =
      bakery.category.charAt(0).toUpperCase() + bakery.category.slice(1);
    document.getElementById("bakeryName").textContent = bakery.name;
    document.getElementById("bakeryRating").textContent =
      "★ " + bakery.rating + " · " + bakery.distance;
    document.getElementById("bakeryDescription").textContent = bakery.description;
    document.getElementById("favoriteButton").dataset.fav = bakery.id;
    document.getElementById("reviewLink").href =
      "reviews.html?bakery=" + encodeURIComponent(bakery.name);
    document.getElementById("directionsLink").href =
      "https://www.google.com/maps/search/?api=1&query=" +
      encodeURIComponent(bakery.name);
    bakeryContent.hidden = false;
    refreshFavoriteButtons();

    //reviews that visitors saved for this bakery
    const list = document.getElementById("bakeryReviews");
    const saved = Store.read(KEYS.reviews)
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
  }
}

/* ==========================================================
   PROFILE PAGE
   ========================================================== */
const profileMain = document.getElementById("profileMain");
if (profileMain) {
  const user = getCurrentUser();
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

    //saved bakeries + this user's reviews + a preview of the saved JSON
    const renderProfileData = () => {
      const fresh = getCurrentUser();
      const favList = document.getElementById("favoriteList");
      favList.replaceChildren();
      const favorites = BAKERIES.filter((b) => (fresh.favorites || []).includes(b.id));
      favorites.forEach((b) => {
        const card = el("div", "card bakery");
        const heart = el("button", "fav-btn", "♥");
        heart.type = "button";
        heart.dataset.fav = b.id;
        heart.setAttribute("aria-label", "Remove " + b.name + " from favorites");

        const imageLink = el("a", "card-link");
        imageLink.href = "bakery.html?id=" + b.id;
        const frame = el("div", "bakery-image");
        const img = document.createElement("img");
        img.src = b.image;
        img.alt = b.name;
        frame.appendChild(img);
        imageLink.appendChild(frame);

        const title = el("h3");
        const titleLink = el("a", "", b.name);
        titleLink.href = "bakery.html?id=" + b.id;
        title.appendChild(titleLink);

        card.append(
          heart,
          imageLink,
          title,
          el("div", "rating", "★ " + b.rating + " · " + b.distance),
          el("p", "", b.description),
        );
        favList.appendChild(card);
      });
      document.getElementById("noFavorites").hidden = favorites.length > 0;

      const myReviews = Store.read(KEYS.reviews)
        .filter((r) => r.email === fresh.email)
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
        reviewList.appendChild(card);
      });
      document.getElementById("noMyReviews").hidden = myReviews.length > 0;

      document.getElementById("dataPreview").textContent = JSON.stringify(fresh, null, 2);
    };
    renderProfileData();
    document.addEventListener("favoritesChanged", renderProfileData);

    document.getElementById("downloadUsers").addEventListener("click", () => {
      downloadJSON("users.json", Store.read(KEYS.users));
      showToast("users.json downloaded.");
    });
    document.getElementById("downloadReviews").addEventListener("click", () => {
      downloadJSON("reviews.json", Store.read(KEYS.reviews));
      showToast("reviews.json downloaded.");
    });
    document.getElementById("logoutButton").addEventListener("click", () => {
      clearSession();
      window.location.href = "login.html";
    });
  }
}

/* ==========================================================
   CATEGORY PAGE BUTTONS
   ========================================================== */
const categoryButtons = document.querySelectorAll(
  ".category-card[data-category]",
);
const categoryImages = document.querySelectorAll("[data-category-image]");
const categoryExploreLink = document.getElementById("categoryExploreLink");

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
    if (categoryExploreLink) {
      categoryExploreLink.href = "explore.html?category=" + selectedCategory;
      categoryExploreLink.textContent = "Explore " + selectedCategory + " →";
    }
  }

  categoryButtons.forEach((button) =>
    button.addEventListener("click", () =>
      selectCategory(button.dataset.category),
    ),
  );
  selectCategory(requestedCategory || "cakes");
}
