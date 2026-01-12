// import { NextRequest, NextResponse } from 'next/server';
// import bcrypt from 'bcryptjs';
// import dbConnect from '@/lib/mongodb';
// import User from '@/models/User';
// import { setSession } from '@/lib/auth';

// export async function POST(request: NextRequest) {
//   try {
//     const { name, email, password } = await request.json();

//     if (!name || !email || !password) {
//       return NextResponse.json(
//         { error: 'Please provide all required fields' },
//         { status: 400 }
//       );
//     }

//     if (password.length < 8) {
//       return NextResponse.json(
//         { error: 'Password must be at least 8 characters long' },
//         { status: 400 }
//       );
//     }

//     await dbConnect();
//     const existingUser = await User.findOne({ email: email.toLowerCase() });
//     if (existingUser) {
//       return NextResponse.json(
//         { error: 'User with this email already exists' },
//         { status: 400 }
//       );
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const user = await User.create({
//       name,
//       email: email.toLowerCase(),
//       password: hashedPassword,
//     });

//     await setSession({
//       userId: String(user._id),
//       email: user.email,
//     });

//     return NextResponse.json(
//       {
//         message: 'User created successfully',
//         user: {
//           id: user._id,
//           name: user.name,
//           email: user.email,
//         },
//       },
//       { status: 201 }
//     );
//   } catch (error) {
//     console.error('Signup error:', error);
//     return NextResponse.json(
//       { error: 'Internal server error' },
//       { status: 500 }
//     );
//   }
// }

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import { setSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Please provide all required fields' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    await dbConnect();
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    await setSession({
      userId: String(user._id),
      email: user.email,
    });

    return NextResponse.json(
      {
        message: 'User created successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
