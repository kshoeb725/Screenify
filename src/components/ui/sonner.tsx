import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/hooks/use-theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background/90 group-[.toaster]:text-foreground group-[.toaster]:border-border/60 group-[.toaster]:shadow-2xl rounded-2xl border px-4 py-3.5 flex gap-3 text-xs font-sans items-center backdrop-blur-lg transition-all duration-300",
          success:
            "group-[.toast]:border-[#3ECFB2]/30 group-[.toast]:bg-[#3ECFB2]/5 dark:group-[.toast]:bg-[#3ECFB2]/10",
          error:
            "group-[.toast]:border-red-500/30 group-[.toast]:bg-red-500/5 dark:group-[.toast]:bg-red-500/10",
          warning:
            "group-[.toast]:border-yellow-500/30 group-[.toast]:bg-yellow-500/5 dark:group-[.toast]:bg-yellow-500/10",
          info:
            "group-[.toast]:border-blue-500/30 group-[.toast]:bg-blue-500/5 dark:group-[.toast]:bg-blue-500/10",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-semibold rounded-lg text-[10px] py-1.5 px-2.5",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-semibold rounded-lg text-[10px] py-1.5 px-2.5",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
