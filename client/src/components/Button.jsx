import clsx from "clsx";

const Button = ({ className, label, type, onClick = () => {}, icon, iconPosition = "right", loading = false, disabled = false }) => {
  return (
    <button
      type={type || "button"}
      className={clsx(
        "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-500 text-white shadow-md hover:from-indigo-500 hover:to-blue-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {icon && iconPosition === "left" && <span className="text-lg">{icon}</span>}
      {loading ? (
        <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>
      ) : (
        <span>{label}</span>
      )}
      {icon && iconPosition === "right" && <span className="text-lg">{icon}</span>}
    </button>
  );
};

export default Button;
