import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import illustration from "@/assets/404-illustration.svg";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex flex-1 items-center justify-center bg-background py-16 px-4">
        <div className="text-center max-w-md">
          <img src={illustration} alt="Page not found" className="mx-auto mb-8 w-72 md:w-96" />
          <h1 className="font-display text-5xl font-extrabold text-foreground mb-3">404</h1>
          <p className="text-lg text-muted-foreground mb-6">
            Oops! The page you're looking for doesn't exist.
          </p>
          <Link to="/">
            <Button size="lg">Return to Home</Button>
          </Link>
        </div>
      </div>
    </Layout>
  );
};

export default NotFound;
