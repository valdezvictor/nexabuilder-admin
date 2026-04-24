import { http, setAccessToken } from "../lib/http";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
};

type MeResponse = {
  id: string;
  email: string;
  role: string;
  tenant: {
    id: string;
    name: string;
    domain: string;
    type: string;
  };
};

export async function login(email: string, password: string) {
  const res = await http.post<LoginResponse>("/auth/login", { email, password });
  const { access_token } = res.data;
  setAccessToken(access_token);
  return res.data;
}

export async function fetchMe() {
  const res = await http.get<MeResponse>("/auth/me");
  return res.data;
}

