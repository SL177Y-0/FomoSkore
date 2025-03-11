import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  totalScore: 0,
  title: "",
};

const scoreSlice = createSlice({
  name: "score",
  initialState,
  reducers: {
    setScore: (state, action) => {
      state.totalScore += action.payload.score;
      state.title = action.payload.title;
    },
    resetScore: (state) => {
      state.totalScore = 0; // ✅ Reset total score to zero
      state.title = "";      // ✅ Clear the title
    },
  },
});

export const { setScore, resetScore } = scoreSlice.actions;
export default scoreSlice.reducer;
