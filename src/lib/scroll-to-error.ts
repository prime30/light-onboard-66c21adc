import { FieldErrors } from "react-hook-form";

/**
 * Scrolls to the first field with a validation error
 * Uses data-field attributes to find the error field
 */
export function scrollToFirstError(
  errors: FieldErrors,
  containerRef?: React.RefObject<HTMLElement>
): void {
  // Get the first error field name
  const firstErrorField = Object.keys(errors)[0];
  if (!firstErrorField) return;

  // Try to find the element by data-field attribute first
  let errorElement = document.querySelector(`[data-field="${firstErrorField}"]`);

  // If not found, try to find by id or name
  if (!errorElement) {
    errorElement =
      document.getElementById(firstErrorField) ||
      document.querySelector(`[name="${firstErrorField}"]`);
  }

  // If still not found, try common variations
  if (!errorElement) {
    // Try camelCase to kebab-case conversion
    const kebabCase = firstErrorField.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    errorElement =
      document.querySelector(`[data-field="${kebabCase}"]`) || document.getElementById(kebabCase);
  }

  if (errorElement) {
    // Get the scroll container (either the provided ref or the main content area)
    const scrollContainer =
      containerRef?.current ||
      document.querySelector("[data-scroll-container]") ||
      errorElement.closest(".overflow-y-auto");

    if (scrollContainer) {
      // Calculate the element's position relative to the scroll container
      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = errorElement.getBoundingClientRect();
      const offsetTop = elementRect.top - containerRect.top + scrollContainer.scrollTop;

      // Scroll to the element with some padding at the top
      scrollContainer.scrollTo({
        top: Math.max(0, offsetTop - 100),
        behavior: "smooth",
      });
    } else {
      // Fallback to scrollIntoView
      errorElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }

    // Focus the input if it's focusable
    const focusableElement = errorElement.querySelector(
      "input, select, textarea, button"
    ) as HTMLElement;
    if (focusableElement) {
      setTimeout(() => {
        focusableElement.focus();
      }, 300);
    } else if ((errorElement as HTMLElement).focus) {
      setTimeout(() => {
        (errorElement as HTMLElement).focus();
      }, 300);
    }

    // Add a brief highlight animation
    errorElement.classList.add("field-error-highlight");
    setTimeout(() => {
      errorElement?.classList.remove("field-error-highlight");
    }, 2000);
  }
}

/**
 * Creates a scroll-to-error handler for use with react-hook-form
 */
export function createScrollToErrorHandler(containerRef?: React.RefObject<HTMLElement>) {
  return (errors: FieldErrors) => {
    if (Object.keys(errors).length > 0) {
      scrollToFirstError(errors, containerRef);
    }
  };
}
