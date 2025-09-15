import React, { useEffect, useState } from "react";

export default function App(){
  const [questions, setQuestions] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [timeMinutes, setTimeMinutes] = useState(30);
  const [started, setStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // key: question index, value: [option indexes]
  const [finished, setFinished] = useState(false);
  const [scorePoints, setScorePoints] = useState(0);
  const [topicResults, setTopicResults] = useState({});

  useEffect(()=>{
    fetch('/src/questions.json')
      .then(r=>r.json())
      .then(data=>{ setQuestions(data); setLoaded(true); })
      .catch(err=>{ console.error(err); alert('Failed to load questions.json')});
  },[]);

  useEffect(()=>{
    if(started && !finished){
      if(timeLeft <= 0){ handleFinish(); return; }
      const t = setInterval(()=> setTimeLeft(s=>s-1), 1000);
      return ()=> clearInterval(t);
    }
  },[started, timeLeft, finished]);

  function startQuiz(){
    setStarted(true);
    setTimeLeft(timeMinutes * 60);
    setCurrent(0);
    setAnswers({});
    setFinished(false);
    setScorePoints(0);
    setTopicResults({});
  }

  function toggleSelect(qIdx, optIdx, multiple){
    setAnswers(prev=>{
      const cur = prev[qIdx] ? [...prev[qIdx]] : [];
      if(!multiple){
        return {...prev, [qIdx]: [optIdx]};
      }
      const exists = cur.includes(optIdx);
      if(exists) {
        const next = cur.filter(x=>x!==optIdx);
        return {...prev, [qIdx]: next};
      } else {
        cur.push(optIdx);
        return {...prev, [qIdx]: cur};
      }
    });
  }

  function goNext(){ if(current < questions.length-1) setCurrent(c=>c+1); }
  function goPrev(){ if(current > 0) setCurrent(c=>c-1); }

  function calculateResults(){
    const totalQuestions = questions.length;
    const questionValue = 1000 / totalQuestions;
    let total = 0;
    const topics = {};
    questions.forEach((q, idx)=>{
      const sel = (answers[idx]||[]).slice().sort((a,b)=>a-b);
      const correct = (q.correctAnswers||[]).slice().sort((a,b)=>a-b);
      const isCorrect = JSON.stringify(sel) === JSON.stringify(correct);
      if(!topics[q.topic]) topics[q.topic] = { points:0, totalQuestions:0, correct:0 };
      topics[q.topic].totalQuestions += 1;
      if(isCorrect){
        topics[q.topic].points += questionValue;
        topics[q.topic].correct += 1;
        total += questionValue;
      }
    });
    total = Math.round((total + Number.EPSILON) * 100) / 100;
    return { total, topics };
  }

  function handleFinish(){
    if(finished) return;
    const { total, topics } = calculateResults();
    setScorePoints(total);
    setTopicResults(topics);
    setFinished(true);
    setTimeLeft(0);
  }

  if(!loaded) return (<div className="min-h-screen flex items-center justify-center">Loading questions...</div>);
  if(!started){
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-2xl bg-white p-6 rounded shadow">
          <h1 className="text-2xl font-bold mb-3">GitHub Administration Quiz</h1>
          <p className="mb-4">65 questions — Total score: 1000 pts. Pass = 700 pts.</p>

          <div className="mb-4">
            <label className="block font-semibold mb-2">Select time limit</label>
            <div className="flex gap-3">
              {[30,60,90].map(m=>(
                <button key={m} onClick={()=>setTimeMinutes(m)} className={`px-4 py-2 rounded border ${timeMinutes===m? 'bg-blue-600 text-white':'bg-white'}`}>{m} minutes</button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button className="px-4 py-2 rounded border" onClick={()=>{ setTimeMinutes(30); }}>Reset</button>
            <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={startQuiz}>Start Quiz</button>
          </div>
        </div>
      </div>
    );
  }

  if(finished){
    const percent = Math.round((scorePoints/1000)*1000)/10;
    const pass = scorePoints >= 700;
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
          <h2 className="text-2xl font-bold mb-2">Results</h2>
          <p className="mb-2">Score: <span className="font-mono">{Math.round(scorePoints*100)/100} / 1000</span> — {percent}%</p>
          <p className={`mb-4 font-semibold ${pass? 'text-green-600':'text-red-600'}`}>{pass? 'PASS':'FAIL'}</p>

          <div className="mb-4">
            <h3 className="font-semibold">Per-topic breakdown</h3>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(topicResults).map(t=>{
                const tr = topicResults[t];
                const tPoints = Math.round(tr.points*100)/100;
                const tTotalPts = Math.round((tr.totalQuestions*(1000/questions.length))*100)/100;
                const tPercent = Math.round((tPoints / tTotalPts)*1000)/10;
                return (
                  <div key={t} className="p-3 border rounded">
                    <div className="font-semibold">{t}</div>
                    <div className="text-sm">{tPoints} / {tTotalPts} pts — {tPercent}%</div>
                    <div className="text-sm">Correct: {tr.correct} / {tr.totalQuestions}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold">Review answers</h3>
            <div className="mt-3 space-y-4">
              {questions.map((q, idx)=>{
                const userSel = answers[idx]||[];
                return (
                  <div key={idx} className="p-3 border rounded bg-gray-50">
                    <div className="font-semibold">Q{idx+1}. {q.question}</div>
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt, oi)=>{
                        const isCorrect = (q.correctAnswers||[]).includes(oi);
                        const wasSelected = userSel.includes(oi);
                        return (
                          <div key={oi} className={`p-2 rounded ${isCorrect? 'bg-green-100 border border-green-300':''} ${wasSelected && !isCorrect? 'bg-red-100 border border-red-300':''}`}>
                            <div className="flex items-center gap-2">
                              <div className="font-mono">{String.fromCharCode(65+oi)}</div>
                              <div className="flex-1">{opt}</div>
                              {wasSelected && isCorrect && <div className="text-green-700 text-sm">Your answer ✓</div>}
                              {wasSelected && !isCorrect && <div className="text-red-700 text-sm">Your answer ✗</div>}
                              {!wasSelected && isCorrect && <div className="text-green-700 text-sm">Correct</div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={()=>{
              // restart (keep fixed order)
              setStarted(false); setFinished(false); setAnswers({}); setScorePoints(0); setTopicResults({});
            }}>Restart</button>
          </div>
        </div>
      </div>
    );
  }

  // in-quiz view
  const q = questions[current];
  const multiple = (q.correctAnswers||[]).length > 1;
  const totalQuestions = questions.length;
  const progress = Math.round(((current+1)/totalQuestions)*100);
  const mins = Math.floor(timeLeft/60).toString().padStart(2,'0');
  const secs = Math.floor(timeLeft%60).toString().padStart(2,'0');

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">GitHub Admin Quiz</h2>
            <div className="text-sm text-gray-600">Question {current+1} of {questions.length}</div>
          </div>
          <div className="text-right">
            <div className="text-sm">Time left</div>
            <div className="font-mono text-lg">{mins}:{secs}</div>
          </div>
        </div>

        <div className="p-4 border rounded mb-4">
          <div className="font-semibold mb-2">Q{current+1}. {q.question}</div>
          <div className="space-y-2">
            {q.options.map((opt, oi)=>{
              const checked = (answers[current]||[]).includes(oi);
              return (
                <label key={oi} className={`flex items-center gap-3 p-2 border rounded ${checked? 'bg-blue-50':''}`}>
                  <input type={multiple? 'checkbox':'radio'} checked={checked} onChange={()=>toggleSelect(current, oi, multiple)} />
                  <div className="flex-1">{String.fromCharCode(65+oi)}. {opt}</div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded border" onClick={goPrev} disabled={current===0}>Previous</button>
            {current < questions.length-1 ? (
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={goNext}>Next</button>
            ) : (
              <button className="px-3 py-2 rounded bg-green-600 text-white" onClick={handleFinish}>Submit Quiz</button>
            )}
          </div>
          <div className="text-sm text-gray-600">Progress: {progress}%</div>
        </div>
      </div>
    </div>
  );
}
