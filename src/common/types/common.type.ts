import mongoose from 'mongoose'

export type IdLike<T> = mongoose.Types.ObjectId | string | number | T
