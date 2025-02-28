// import { signIn, useSession } from "next-auth/react";
// import { useRouter } from "next/router";
// import { useEffect } from "react";

// const SignIn = () => {
//   const { data: session } = useSession();
//   const router = useRouter();

//   useEffect(() => {
//     if (session) router.push("/");
//   }, [session, router]);

//   return (
//     <div className="flex items-center justify-center h-screen">
//       <button
//         onClick={() => signIn("google")}
//         className="px-6 py-3 text-white bg-blue-500 rounded-lg"
//       >
//         Sign in with Google
//       </button>
//     </div>
//   );
// };

// export default SignIn;
