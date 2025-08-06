import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, Loading, Textbox } from "../components";
import { useLoginMutation } from "../redux/slices/api/authApiSlice";
import { setCredentials } from "../redux/slices/authSlice";

const Login = () => {
  const { user } = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const handleLogin = async (data) => {
    try {
      const res = await login(data).unwrap();
      dispatch(setCredentials(res));
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-[#232136] dark:via-indigo-900 dark:to-purple-900 transition-all duration-300">
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-10 py-10 px-2 md:px-0">
        {/* Left illustration & slogan */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1">
          <div className="mb-8">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="60" fill="#6366f1"/><path d="M40 65l13 13 27-27" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="py-2 px-6 rounded-full text-lg font-semibold bg-white/20 text-white shadow-lg mb-4">Manage your tasks efficiently!</span>
          <h1 className="text-4xl font-extrabold text-white drop-shadow text-center leading-tight">ZenTask<br/>Cloud-based Task Manager</h1>
        </div>
        {/* Login form */}
        <div className="w-full md:w-[420px] bg-white dark:bg-[#18192b] rounded-3xl shadow-2xl p-8 flex flex-col gap-8 animate-fade-in">
          <div>
            <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 text-center mb-2">Welcome back!</h2>
            <p className="text-center text-base text-gray-500 dark:text-gray-400">Sign in to continue managing your tasks.</p>
          </div>
          <form onSubmit={handleSubmit(handleLogin)} className="flex flex-col gap-6">
            <Textbox
              placeholder="you@example.com"
              type="email"
              name="email"
              label="Email Address"
              className="w-full rounded-xl"
              register={register("email", {
                required: "Email Address is required!",
              })}
              error={errors.email ? errors.email.message : ""}
            />
            <Textbox
              placeholder="Password"
              type="password"
              name="password"
              label="Password"
              className="w-full rounded-xl"
              register={register("password", {
                required: "Password is required!",
              })}
              error={errors.password ? errors.password?.message : ""}
            />
            <span className="text-sm text-indigo-600 hover:underline cursor-pointer text-right">Forgot password?</span>
            {isLoading ? (
              <Loading />
            ) : (
              <Button
                type="submit"
                label="Sign In"
                className="w-full h-12 text-lg font-bold rounded-xl mt-2"
              />
            )}
          </form>
          <div className="text-center">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-600 hover:underline font-semibold">
                Sign up
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
