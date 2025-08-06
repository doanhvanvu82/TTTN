import { useForm } from "react-hook-form";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Button, Loading, Textbox } from "../components";
import { useRegisterMutation } from "../redux/slices/api/authApiSlice";
import { setCredentials } from "../redux/slices/authSlice";
import { useEffect } from "react";

const Register = () => {
  const { user } = useSelector((state) => state.auth);
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm();

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [registerUser, { isLoading }] = useRegisterMutation();

  const handleRegister = async (data) => {
    try {
      const res = await registerUser(data).unwrap();
      dispatch(setCredentials(res));
      toast.success("Tạo tài khoản thành công!");
      navigate("/");
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  useEffect(() => {
    user && navigate("/dashboard");
  }, [user]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 dark:from-[#232136] dark:via-indigo-900 dark:to-purple-900 transition-all duration-300">
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-center gap-10 py-10 px-2 md:px-0">
        {/* Left illustration & slogan */}
        <div className="hidden md:flex flex-col items-center justify-center flex-1">
          <div className="mb-8">
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none"><circle cx="60" cy="60" r="60" fill="#6366f1"/><path d="M40 65l13 13 27-27" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <span className="py-2 px-6 rounded-full text-lg font-semibold bg-white/20 text-white shadow-lg mb-4">Join our task management platform!</span>
          <h1 className="text-4xl font-extrabold text-white drop-shadow text-center leading-tight">ZenTask<br/>Create a new account</h1>
        </div>
        {/* Register form */}
        <div className="w-full md:w-[420px] bg-white dark:bg-[#18192b] rounded-3xl shadow-2xl p-8 flex flex-col gap-8 animate-fade-in">
          <div>
            <h2 className="text-3xl font-bold text-indigo-700 dark:text-indigo-300 text-center mb-2">Create Account</h2>
            <p className="text-center text-base text-gray-500 dark:text-gray-400">Join our task management platform!</p>
          </div>
          <form onSubmit={handleSubmit(handleRegister)} className="flex flex-col gap-6">
            <Textbox
              placeholder="John Doe"
              type="text"
              name="name"
              label="Full Name"
              className="w-full rounded-xl"
              register={register("name", {
                required: "Full name is required!",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters",
                },
              })}
              error={errors.name ? errors.name.message : ""}
            />
            <Textbox
              placeholder="you@example.com"
              type="email"
              name="email"
              label="Email Address"
              className="w-full rounded-xl"
              register={register("email", {
                required: "Email Address is required!",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Invalid email address",
                },
              })}
              error={errors.email ? errors.email.message : ""}
            />
            <Textbox
              placeholder="Software Developer"
              type="text"
              name="title"
              label="Job Title (Optional)"
              className="w-full rounded-xl"
              register={register("title")}
              error={errors.title ? errors.title.message : ""}
            />
            <Textbox
              placeholder="Company Name"
              type="text"
              name="company"
              label="Company (Optional)"
              className="w-full rounded-xl"
              register={register("company")}
              error={errors.company ? errors.company.message : ""}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Role</label>
              <select
                {...register("role", { required: "Please select a role" })}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-[#232136] dark:text-white"
              >
                <option value="member">Team Member</option>
                <option value="project_manager">Project Manager</option>
              </select>
              {errors.role && (
                <p className="text-red-500 text-sm mt-1">{errors.role.message}</p>
              )}
            </div>
            <Textbox
              placeholder="Password"
              type="password"
              name="password"
              label="Password"
              className="w-full rounded-xl"
              register={register("password", {
                required: "Password is required!",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              })}
              error={errors.password ? errors.password?.message : ""}
            />
            <Textbox
              placeholder="Confirm password"
              type="password"
              name="confirmPassword"
              label="Confirm Password"
              className="w-full rounded-xl"
              register={register("confirmPassword", {
                required: "Please confirm your password!",
                validate: (val) => {
                  if (watch('password') != val) {
                    return "Passwords do not match!";
                  }
                },
              })}
              error={errors.confirmPassword ? errors.confirmPassword.message : ""}
            />
            {isLoading ? (
              <Loading />
            ) : (
              <Button
                type="submit"
                label="Sign Up"
                className="w-full h-12 text-lg font-bold rounded-xl mt-2"
              />
            )}
          </form>
          <div className="text-center mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Already have an account?{' '}
              <Link to="/log-in" className="text-indigo-600 hover:underline font-semibold">
                Sign in
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register; 