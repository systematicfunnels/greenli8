import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import env from '../config/env.ts';
import prisma from '../config/prisma.ts';
import logger from '../utils/logger.ts';

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

export const signup = async ({ email, password, name }: { email: string; password: string; name?: string }) => {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const error = new Error("User already exists") as any;
    error.status = 409;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: name || email.split('@')[0],
      credits: 3,
      preferences: {
        emailNotifications: true,
        marketingEmails: false,
        theme: 'light'
      } as any
    }
  });

  const token = jwt.sign(
    { email: user.email, id: user.id, isPro: user.isPro },
    env.jwtSecret,
    { expiresIn: '7d' }
  );

  // Background: Send welcome email
  if (resend) {
    resend.emails.send({
      from: env.emailFrom,
      to: email,
      subject: "Welcome to Greenli8! 🚀",
      html: `<h2>Welcome, ${user.name}!</h2><p>You have 3 free credits to start validating ideas.</p>`
    }).catch(e => logger.error('Email failed:', e));
  }

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const login = async ({ email, password }: any) => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.password) {
    const error = new Error("Invalid credentials") as any;
    error.status = 401;
    throw error;
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    const error = new Error("Invalid credentials") as any;
    error.status = 401;
    throw error;
  }

  const token = jwt.sign(
    { email: user.email, id: user.id, isPro: user.isPro },
    env.jwtSecret,
    { expiresIn: '7d' }
  );

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

export const googleLogin = async (token: string) => {
  console.log('[Auth Service] Attempting Google userinfo fetch');
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!userInfoRes.ok) {
    const errorText = await userInfoRes.text();
    console.error('[Auth Service] Google userinfo failed:', userInfoRes.status, errorText);
    const error = new Error("Invalid Google token") as any;
    error.status = 401;
    throw error;
  }
  
  const payload = await userInfoRes.json() as any;
  const { email, name, sub: googleId } = payload;

  let user = await prisma.user.findUnique({ where: { email } });
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        googleId,
        credits: 3,
        preferences: {
          emailNotifications: true,
          marketingEmails: false,
          theme: 'light'
        } as any
      }
    });
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { email },
      data: { googleId }
    });
  }

  const jwtToken = jwt.sign(
    { email: user.email, id: user.id, isPro: user.isPro },
    env.jwtSecret,
    { expiresIn: '7d' }
  );

  if (isNewUser && resend) {
    resend.emails.send({
      from: env.emailFrom,
      to: email,
      subject: "Welcome to Greenli8! 🚀",
      html: `<h2>Welcome, ${user.name}!</h2><p>You have 3 free credits to start validating ideas.</p>`
    }).catch(e => logger.error('Email failed:', e));
  }

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token: jwtToken, isNewUser };
};

export const getCurrentUser = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      isPro: true,
      credits: true,
      preferences: true,
      createdAt: true
    }
  });
  if (!user) {
    const error = new Error("User not found") as any;
    error.status = 404;
    throw error;
  }
  return user;
};

export const updateProfile = async (email: string, data: any) => {
  return await prisma.user.update({
    where: { email },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      isPro: true,
      credits: true,
      preferences: true
    }
  });
};

export const deleteAccount = async (email: string) => {
  await prisma.user.delete({ where: { email } });
};
