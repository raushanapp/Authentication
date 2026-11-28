import { FieldError } from "./field_error.js";

const passwordfield = document.getElementById("password") as HTMLInputElement;
const passwordInvalidLabel = document.getElementById(
  "invalid-password",
) as HTMLElement;

const emailfield = document.getElementById("email") as HTMLInputElement;
const emailInvalidLabel = document.getElementById(
  "invalid-email",
) as HTMLElement;

const submitBtn = document.getElementById("form-submit");

const errors = new FieldError();

function updateSubmitBtn(): void {
  if (errors.isEmpty()) {
    submitBtn?.classList.remove("btn-disabled");
  } else {
    submitBtn?.classList.add("btn-disabled");
  }
}

emailfield.addEventListener("input", () => {
  //   errors.remove("email", emailfield, emailInvalidLabel);
  updateSubmitBtn();
});

passwordfield.addEventListener("input", () => {
  //   errors.remove("password", passwordfield, passwordInvalidLabel);
  updateSubmitBtn();
});
