import NextAuth, { DefaultSession } from "next-auth";
import { adminDb } from "@/lib/firebase-admin";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
  }
}
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || "4c30c8df634f19b22a6bbffeb5e4d2938a16dbd76eaef6b3992b158021b777a8",
  session: { strategy: "jwt" },
  cookies: {
    sessionToken: {
      name: "__session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        action: { label: "Action", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username.toString().toLowerCase();

        // 1. Check hardcoded admin as fallback
        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD || "123456";

        if (username === adminUsername.toLowerCase() && credentials.password === adminPassword) {
          return { id: "1", name: "thesuperg", email: "admin@habad.local", role: "SUPERADMIN" };
        }

        // 2. Check Firestore
        try {
          const usersRef = adminDb.collection("users");
          const snapshot = await usersRef.where("username", "==", username).limit(1).get();
          
          if (!snapshot.empty) {
            if (credentials.action === "register") {
              // User already exists, cannot register
              throw new Error("User already exists");
            }
            
            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            
            if (userData.password === credentials.password) {
              return { 
                id: userDoc.id, 
                name: userData.name || userData.username, 
                email: userData.email, 
                role: userData.role 
              };
            } else {
              throw new Error("Invalid password");
            }
          } else {
            // User does not exist
            if (credentials.action === "register") {
              // Create new user
              const newUserRef = usersRef.doc();
              const newUserData = {
                username,
                email: username, // Assuming username is email
                password: credentials.password,
                role: "USER",
                createdAt: new Date().toISOString()
              };
              await newUserRef.set(newUserData);
              
              return {
                id: newUserRef.id,
                name: username,
                email: username,
                role: "USER"
              };
            }
          }
        } catch (error) {
          console.error("Auth Error querying Firestore:", error);
          throw error;
        }

        return null;
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      checks: ["none"],
      authorization: {
        params: {
          prompt: "select_account"
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user && account) {
        if (account.provider === "google") {
          try {
            const email = user.email;
            if (email) {
              const usersRef = adminDb.collection("users");
              const snapshot = await usersRef.where("email", "==", email).limit(1).get();
              
              if (!snapshot.empty) {
                // User exists, pull role and id from Firestore
                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();
                token.id = userDoc.id;
                token.role = userData.role || "USER";
              } else {
                // User doesn't exist, create a new one
                const newUserRef = usersRef.doc();
                const newUserData = {
                  username: email.split("@")[0],
                  email: email,
                  name: user.name || email.split("@")[0],
                  role: "USER",
                  createdAt: new Date().toISOString(),
                  authProvider: "google"
                };
                await newUserRef.set(newUserData);
                
                // Add as CRM Contact for the admin
                try {
                  const communitiesRef = adminDb.collection("communities");
                  const commSnap = await communitiesRef.where("ownerId", "==", "1").where("name", "==", "קהילת לקוחות").limit(1).get();
                  let communityId = "";
                  if (commSnap.empty) {
                    const newCommRef = communitiesRef.doc();
                    await newCommRef.set({
                      ownerId: "1",
                      name: "קהילת לקוחות",
                      icon: "Users",
                      color: "#3b82f6",
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                    communityId = newCommRef.id;
                  } else {
                    communityId = commSnap.docs[0].id;
                  }

                  const contactsRef = adminDb.collection("contacts");
                  const nameParts = (user.name || email.split("@")[0]).split(" ");
                  const firstName = nameParts[0] || "";
                  const lastName = nameParts.slice(1).join(" ") || "";
                  
                  await contactsRef.add({
                    ownerId: "1",
                    status: "active",
                    conta_name: firstName,
                    f_m: lastName,
                    email: email,
                    conta_phone: "",
                    lead_source: "הרשמה מגוגל",
                    communityIds: [communityId],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                } catch (e) {
                  console.error("Failed to create CRM contact for new Google user:", e);
                }
                
                token.id = newUserRef.id;
                token.role = "USER";
              }
            }
          } catch (error) {
            console.error("Error linking Google account in jwt:", error);
            // Fallbacks if DB fails
            token.role = "USER";
            token.id = user.id;
          }
        } else {
          // Credentials login already provides the exact ID and role
          token.role = user.role;
          token.id = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        if (token.role) (session.user as any).role = token.role;
        (session.user as any).id = token.id || token.sub;

        // Impersonation logic
        if (token.role === "SUPERADMIN") {
          try {
            const { cookies } = require("next/headers");
            const cookieStore = await cookies();
            const impersonatedId = cookieStore.get("impersonated_user_id")?.value;
            if (impersonatedId) {
              (session.user as any).originalAdminId = token.id || token.sub;
              (session.user as any).id = impersonatedId;
              (session.user as any).isImpersonating = true;
            }
          } catch (e) {
            // Ignore error if cookies() is called outside request context
          }
        }
      }
      return session;
    },
    authorized: ({ auth, request: { nextUrl } }) => {
      const isLoggedIn = !!auth?.user;
      const userRole = (auth?.user as any)?.role;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");

      if (isOnAdmin) {
        if (isLoggedIn && userRole === "SUPERADMIN") return true;
        return false;
      }
      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      }
      return true;
    },
  },
});
