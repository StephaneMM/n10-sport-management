import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { useAdminLogin } from "@/shared/api/auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const AdminLoginPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const loginMutation = useAdminLogin();

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: LoginValues) => {
    loginMutation.mutate({ email: data.email, password: data.password }, {
      onSuccess: () => navigate("/admin/dashboard"),
    });
  };

  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-10">
          <Link to="/" className="font-display text-3xl font-bold text-primary-foreground">
            N10<span className="text-gold">.</span>
          </Link>
          <p className="font-body text-primary-foreground/50 mt-3 text-sm tracking-wide uppercase">
            {t("admin.portal")}
          </p>
        </div>

        <div className="bg-navy-light rounded-lg p-8 border border-primary-foreground/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary-foreground/80 font-body text-sm">{t("admin.email")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="admin@n10sport.com"
                        className="bg-primary border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-primary-foreground/80 font-body text-sm">{t("admin.password")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="bg-primary border-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gold text-primary hover:bg-gold-light font-body py-5 tracking-wide"
              >
                {loginMutation.isPending ? t("admin.signing_in") : t("admin.sign_in")}
              </Button>
            </form>
          </Form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;
