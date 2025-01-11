function getCharCount(inputID, counterID, maxLength) {
  const input = document.getElementById(inputID);
  const counter = document.getElementById(counterID);

  if (!input) {
    console.error(`Could not find elements for ${inputID}`);
    return;
  }

  if (!counter) {
    console.error(`Could not find elements for ${counter}`);
    return;
  }

  counter.textContent = `0/${maxLength}`;

  input.addEventListener("input", () => {
    const currentLength = input.value.length;

    counter.textContent = `${currentLength}/${maxLength}`;
    counter.classList.remove("text-warning", "text-danger");

    if (currentLength >= 0.75 * maxLength && currentLength < 0.9 * maxLength) {
      counter.classList.add("text-warning");
    }

    if (currentLength >= 0.9 * maxLength && currentLength <= maxLength) {
      counter.classList.add("text-danger");
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // DOMContentLoaded isn't necessary, but it's good practice.
  // Avoids getCharCount beeing executed without the full EJS loaded.
  console.log("Document loaded, initializing caracter count...!");
  getCharCount("title", "titleCounter", 100);
  getCharCount("content", "contentCounter", 5000);
});
