export interface User {
  uuid: string;
  nick: string;
  email: string;
}

export interface UserStorage {
  user: User;
}

export interface SignInBody {
  email: string;
  password: string;
}

export interface SignUpBody {
  nick: string;
  email: string;
  password: string;
  confirmPass: string;
}

export interface UserResponse {
  token: string;
  user: User;
}
