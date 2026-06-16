const e = React.createElement;
const { useState, useEffect, useRef, useCallback } = React;

const PRIORITIES = ["High","Medium","Low"];
const P_DOT = {High:"#E24B4A",Medium:"#EF9F27",Low:"#639922"};
const SUBJECT_COLORS = ["#378ADD","#639922","#E24B4A","#EF9F27","#9B59B6","#1D9E75","#D85A30","#185FA5"];

function fmt(s){const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;return h>0?`${h}h ${String(m).padStart(2,"0")}m`:`${String(m).padStart(2,"0")}:${String(sc).padStart(2,"0")}`;}
function isToday(d){if(!d)return false;return new Date(d).toDateString()===new Date().toDateString();}
function isThisWeek(d){if(!d)return false;const now=new Date(),day=now.getDay();const mon=new Date(now);mon.setDate(now.getDate()-(day||7)+1);mon.setHours(0,0,0,0);const sun=new Date(mon);sun.setDate(mon.getDate()+6);sun.setHours(23,59,59,999);return new Date(d)>=mon&&new Date(d)<=sun;}
function daysUntil(d){if(!d)return null;return Math.ceil((new Date(d)-new Date())/86400000);}
function todayKey(){return new Date().toISOString().slice(0,10);}
function ls(k,v){if(v===undefined){try{const r=localStorage.getItem("sh_"+k);return r?JSON.parse(r):null;}catch(_){return null;}}try{localStorage.setItem("sh_"+k,JSON.stringify(v));}catch(_){}}

// Inject global styles
const style = document.createElement("style");
style.textContent = `
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif;overscroll-behavior:none;overflow-x:hidden;}
  input,select,button,textarea{font-family:inherit;}
  input[type=date]{-webkit-appearance:none;}
  ::-webkit-scrollbar{display:none;}

  @keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
  @keyframes scaleIn{from{opacity:0;transform:scale(0.95);}to{opacity:1;transform:scale(1);}}
  @keyframes flipNum{0%{opacity:0;transform:translateY(-8px);}100%{opacity:1;transform:translateY(0);}}
  @keyframes pulse{0%,100%{transform:scale(1);}50%{transform:scale(1.04);}}
  @keyframes slideIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:translateX(0);}}

  .btn-tap{transition:transform 0.12s ease,opacity 0.12s ease,background 0.15s ease,box-shadow 0.15s ease;}
  .btn-tap:active{transform:scale(0.93);opacity:0.8;}
  .card-anim{animation:scaleIn 0.2s ease;}
  .fade-up{animation:fadeUp 0.25s ease;}
  .fade-in{animation:fadeIn 0.2s ease;}
  .flip-num{animation:flipNum 0.18s ease;}
  .tab-transition{transition:background 0.2s ease,color 0.2s ease,box-shadow 0.2s ease;}
  .check-anim{transition:background 0.2s ease,border-color 0.2s ease,transform 0.15s ease;}
  .check-anim:active{transform:scale(0.85);}
  .progress-bar{transition:width 0.6s cubic-bezier(0.4,0,0.2,1);}
  .ring-progress{transition:stroke-dashoffset 1s linear;}
  .theme-toggle{transition:background 0.3s ease;}

  .task-row{transition:opacity 0.2s ease,transform 0.2s ease;}
  .task-row:active{opacity:0.7;}

  input:focus,select:focus{outline:none;box-shadow:0 0 0 2px rgba(55,138,221,0.35);}
`;
document.head.appendChild(style);

function App(){
  const prefersDark = window.matchMedia&&window.matchMedia("(prefers-color-scheme:dark)").matches;
  const [dark,setDark]=useState(()=>ls("darkMode")??prefersDark);
  const [view,setView]=useState("tasks");
  const [tasks,setTasks]=useState(()=>ls("tasks")||[]);
  const [subjects,setSubjects]=useState(()=>ls("subjects")||[]);
  const [grades,setGrades]=useState(()=>ls("grades")||[]);
  const [exams,setExams]=useState(()=>ls("exams")||[]);
  const [streak,setStreak]=useState(()=>ls("streak")||{days:0,lastStudied:null,goal:120,todaySecs:0});
  const [pomo,setPomo]=useState(()=>ls("pomo")||{mode:"work",work:25,shortBreak:5,longBreak:15,count:0});
  const [activeTimer,setActiveTimer]=useState(()=>ls("activeTimer")||null);
  const [tick,setTick]=useState(0);
  const [prevSecs,setPrevSecs]=useState(null);
  const [taskView,setTaskView]=useState("today");
  const [adding,setAdding]=useState(false);
  const [nt,setNt]=useState({title:"",dueDate:"",priority:"Medium",subject:""});
  const [ns,setNs]=useState({name:"",color:SUBJECT_COLORS[0]});
  const [addingS,setAddingS]=useState(false);
  const [ng,setNg]=useState({subject:"",assignment:"",score:"",total:"100"});
  const [addingG,setAddingG]=useState(false);
  const [nx,setNx]=useState({subject:"",title:"",date:"",notes:""});
  const [addingX,setAddingX]=useState(false);
  const [pomoRunning,setPomoRunning]=useState(false);
  const [pomoSecs,setPomoSecs]=useState(()=>{const p=ls("pomo");return p?p.work*60:25*60;});
  const pomoRef=useRef(null);
  const timerRef=useRef(null);

  const C = {
    bg: dark?"#111":"#fff",
    bg2: dark?"#1c1c1e":"#f2f2f7",
    bg3: dark?"#2c2c2e":"#e5e5ea",
    border: dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)",
    text: dark?"#f2f2f7":"#1c1c1e",
    text2: dark?"#8e8e93":"#6c6c70",
    text3: dark?"#48484a":"#aeaeb2",
    card: dark?"#1c1c1e":"#ffffff",
  };

  useEffect(()=>{document.body.style.background=C.bg;},[dark]);
  useEffect(()=>{ls("darkMode",dark);},[dark]);
  useEffect(()=>{ls("tasks",tasks);},[tasks]);
  useEffect(()=>{ls("subjects",subjects);},[subjects]);
  useEffect(()=>{ls("grades",grades);},[grades]);
  useEffect(()=>{ls("exams",exams);},[exams]);
  useEffect(()=>{ls("streak",streak);},[streak]);
  useEffect(()=>{ls("pomo",pomo);},[pomo]);
  useEffect(()=>{ls("activeTimer",activeTimer);},[activeTimer]);

  useEffect(()=>{
    if(activeTimer){timerRef.current=setInterval(()=>{setTick(t=>t+1);setStreak(s=>({...s,todaySecs:s.todaySecs+1}));},1000);}
    else clearInterval(timerRef.current);
    return()=>clearInterval(timerRef.current);
  },[activeTimer]);

  useEffect(()=>{
    if(pomoRunning){
      pomoRef.current=setInterval(()=>{
        setPomoSecs(s=>{
          setPrevSecs(s);
          if(s<=1){clearInterval(pomoRef.current);setPomoRunning(false);
            setPomo(p=>{const cnt=p.mode==="work"?p.count+1:p.count;const next=p.mode==="work"?(cnt%4===0?"longBreak":"shortBreak"):"work";const ns2=next==="work"?p.work*60:next==="shortBreak"?p.shortBreak*60:p.longBreak*60;setPomoSecs(ns2);return{...p,mode:next,count:cnt};});return 0;}
          if(pomo.mode==="work")setStreak(s=>({...s,todaySecs:s.todaySecs+1}));
          return s-1;
        });
      },1000);
    } else clearInterval(pomoRef.current);
    return()=>clearInterval(pomoRef.current);
  },[pomoRunning]);

  function getLive(id){const t=tasks.find(t=>t.id===id);const base=t?.loggedSeconds||0;if(activeTimer?.taskId===id)return base+Math.floor((Date.now()-activeTimer.startedAt)/1000);return base;}
  function startTimer(id){if(activeTimer)stopTimer(activeTimer.taskId);setActiveTimer({taskId:id,startedAt:Date.now()});}
  function stopTimer(id){if(!activeTimer||activeTimer.taskId!==id)return;const el=Math.floor((Date.now()-activeTimer.startedAt)/1000);setTasks(p=>p.map(t=>t.id===id?{...t,loggedSeconds:(t.loggedSeconds||0)+el}:t));setActiveTimer(null);}
  function toggleDone(id){if(activeTimer?.taskId===id)stopTimer(id);setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t));updateStreak();}
  function deleteTask(id){if(activeTimer?.taskId===id)setActiveTimer(null);setTasks(p=>p.filter(t=>t.id!==id));}
  function updateStreak(){const today=todayKey();setStreak(s=>{if(s.lastStudied===today)return s;const y=new Date();y.setDate(y.getDate()-1);const yk=y.toISOString().slice(0,10);return{...s,days:s.lastStudied===yk?s.days+1:1,lastStudied:today};});}
  function addTask(){if(!nt.title.trim())return;setTasks(p=>[{id:Date.now(),title:nt.title.trim(),dueDate:nt.dueDate,priority:nt.priority,subject:nt.subject,done:false,loggedSeconds:0,createdAt:new Date().toISOString()},...p]);setNt({title:"",dueDate:"",priority:"Medium",subject:""});setAdding(false);}
  function addSubject(){if(!ns.name.trim())return;setSubjects(p=>[...p,{id:Date.now(),name:ns.name.trim(),color:ns.color}]);setNs({name:"",color:SUBJECT_COLORS[(subjects.length+1)%SUBJECT_COLORS.length]});setAddingS(false);}
  function addGrade(){if(!ng.subject||!ng.assignment||!ng.score)return;setGrades(p=>[...p,{id:Date.now(),...ng,score:parseFloat(ng.score),total:parseFloat(ng.total),date:new Date().toISOString()}]);setNg({subject:"",assignment:"",score:"",total:"100"});setAddingG(false);}
  function addExam(){if(!nx.title||!nx.date)return;setExams(p=>[...p,{id:Date.now(),...nx}]);setNx({subject:"",title:"",date:"",notes:""});setAddingX(false);}
  function subjectColor(name){return subjects.find(s=>s.name===name)?.color||"#888";}
  function avgGrade(){if(!grades.length)return null;return(grades.reduce((a,g)=>a+(g.score/g.total*100),0)/grades.length).toFixed(1);}

  const filteredTasks=tasks.filter(t=>taskView==="today"?(isToday(t.dueDate)||(!t.dueDate&&!t.done)):taskView==="week"?(isThisWeek(t.dueDate)||!t.dueDate):true);
  const upcomingExams=exams.filter(x=>daysUntil(x.date)>=0).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const goalPct=Math.min(100,Math.round(streak.todaySecs/(streak.goal*60)*100));
  const pomoTotal=pomo.mode==="work"?pomo.work*60:pomo.mode==="shortBreak"?pomo.shortBreak*60:pomo.longBreak*60;
  const pomoPct=(1-pomoSecs/pomoTotal)*100;
  const pomoMinsStr=String(Math.floor(pomoSecs/60)).padStart(2,"0");
  const pomoSecsStr=String(pomoSecs%60).padStart(2,"0");

  const inp={fontSize:15,border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 12px",background:C.bg2,color:C.text,outline:"none",boxSizing:"border-box",transition:"box-shadow 0.2s"};
  const card={background:C.card,borderRadius:16,border:`0.5px solid ${C.border}`,overflow:"hidden",marginBottom:12,boxShadow:dark?"0 1px 3px rgba(0,0,0,0.4)":"0 1px 3px rgba(0,0,0,0.06)"};
  const blueBtn={padding:"9px 20px",borderRadius:10,border:"none",background:"#378ADD",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"};
  const ghostBtn={padding:"9px 16px",borderRadius:10,border:`1px solid ${C.border}`,background:"transparent",color:C.text2,fontSize:14,cursor:"pointer"};
  const st={fontSize:11,fontWeight:600,color:C.text3,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:10};
  const views=["tasks","pomodoro","grades","exams","streak"];
  const vIcons={tasks:"✓",pomodoro:"◎",grades:"★",exams:"⚑",streak:"⚡"};
  const vLabels={tasks:"Tasks",pomodoro:"Focus",grades:"Grades",exams:"Exams",streak:"Streak"};
  const pomoColor=pomo.mode==="work"?"#378ADD":pomo.mode==="shortBreak"?"#639922":"#9B59B6";

  return e("div",{style:{color:C.text,minHeight:"100vh",background:C.bg,paddingBottom:32}},
    // Header
    e("div",{style:{padding:"16px 16px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}},
      e("div",null,
        e("div",{style:{fontSize:28,fontWeight:700,letterSpacing:"-0.5px",color:C.text}},"Student Hub"),
        e("div",{style:{fontSize:13,color:C.text2,marginTop:2}},new Date().toLocaleDateString("en-AU",{weekday:"long",month:"long",day:"numeric"}))
      ),
      // Dark mode toggle
      e("button",{className:"btn-tap theme-toggle",onClick:()=>setDark(d=>!d),style:{width:44,height:26,borderRadius:13,border:"none",cursor:"pointer",background:dark?"#378ADD":C.bg3,position:"relative",flexShrink:0,marginTop:4}},
        e("div",{style:{position:"absolute",top:3,left:dark?21:3,width:20,height:20,borderRadius:"50%",background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.3)",transition:"left 0.25s cubic-bezier(0.4,0,0.2,1)"}})
      )
    ),

    // Stats row
    e("div",{style:{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,padding:"0 16px",marginBottom:16}},
      ...[{l:"Left",v:tasks.filter(t=>!t.done).length,c:"#378ADD",b:"rgba(55,138,221,0.10)"},
          {l:"Today",v:fmt(streak.todaySecs),c:"#639922",b:"rgba(99,153,34,0.10)"},
          {l:"Grade",v:avgGrade()?`${avgGrade()}%`:"—",c:"#9B59B6",b:"rgba(155,89,182,0.10)"},
          {l:"Streak",v:`${streak.days}d`,c:"#E24B4A",b:"rgba(226,75,74,0.10)"},
         ].map(x=>e("div",{key:x.l,style:{background:x.b,borderRadius:14,padding:"10px 10px"}},
           e("div",{style:{fontSize:10,fontWeight:600,color:x.c,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:3}},x.l),
           e("div",{key:tick,style:{fontSize:17,fontWeight:700,color:x.c,letterSpacing:"-0.5px"}},x.v)
         ))
    ),

    // Nav tabs
    e("div",{style:{display:"flex",margin:"0 16px 16px",background:C.bg2,borderRadius:14,padding:3}},
      ...views.map(v=>e("button",{key:v,onClick:()=>setView(v),className:"btn-tap tab-transition",style:{flex:1,padding:"7px 2px",borderRadius:11,border:"none",cursor:"pointer",fontSize:11,fontWeight:view===v?600:500,background:view===v?C.card:"transparent",color:view===v?C.text:C.text2,boxShadow:view===v?`0 1px 4px rgba(0,0,0,${dark?0.4:0.1})`:"none"}},`${vIcons[v]}\n${vLabels[v]}`))
    ),

    // Content area
    e("div",{style:{padding:"0 16px"},className:"fade-in",key:view},

    // ── TASKS ──
    view==="tasks"&&e("div",null,
      e("div",{style:{display:"flex",marginBottom:12,background:C.bg2,borderRadius:10,padding:3}},
        ...[["today","Today"],["week","Week"],["all","All"]].map(([v,l])=>e("button",{key:v,onClick:()=>setTaskView(v),className:"btn-tap tab-transition",style:{flex:1,padding:"6px 8px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:taskView===v?600:400,background:taskView===v?C.card:"transparent",color:taskView===v?C.text:C.text2,boxShadow:taskView===v?`0 1px 3px rgba(0,0,0,${dark?0.3:0.08})`:"none"}},l))
      ),
      e("div",{style:card},
        filteredTasks.length===0?e("div",{style:{padding:"1.5rem",textAlign:"center",color:C.text3,fontSize:14}},"No tasks · add one below"):
        filteredTasks.map((task,i)=>{
          const isActive=activeTimer?.taskId===task.id,secs=getLive(task.id),sc=task.subject?subjectColor(task.subject):null;
          return e("div",{key:task.id,className:"task-row fade-up",style:{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",borderBottom:i<filteredTasks.length-1?`0.5px solid ${C.border}`:"none",background:C.card}},
            e("button",{onClick:()=>toggleDone(task.id),className:"check-anim",style:{width:22,height:22,borderRadius:"50%",border:`2px solid ${task.done?"#639922":P_DOT[task.priority]}`,background:task.done?"#639922":"transparent",flexShrink:0,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}},
              task.done&&e("svg",{width:11,height:8,viewBox:"0 0 11 8",fill:"none"},e("path",{d:"M1 4l3 3 6-6",stroke:"#fff",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"}))
            ),
            e("div",{style:{flex:1,minWidth:0}},
              e("div",{style:{fontSize:15,fontWeight:500,color:task.done?C.text3:C.text,textDecoration:task.done?"line-through":"none",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}},task.title),
              e("div",{style:{display:"flex",gap:6,alignItems:"center",marginTop:3,flexWrap:"wrap"}},
                sc&&e("span",{style:{fontSize:11,fontWeight:600,color:sc,background:sc+"20",borderRadius:5,padding:"1px 6px"}},task.subject),
                e("span",{style:{width:5,height:5,borderRadius:"50%",background:P_DOT[task.priority],display:"inline-block",flexShrink:0}}),
                e("span",{style:{fontSize:11,color:C.text3}},task.priority),
                task.dueDate&&e("span",{style:{fontSize:11,color:C.text3}},"· "+new Date(task.dueDate).toLocaleDateString("en-AU",{month:"short",day:"numeric"})),
                (secs>0||isActive)&&e("span",{key:tick,style:{fontSize:11,color:isActive?"#378ADD":C.text3,fontWeight:isActive?600:400}},(isActive?"● ":"")+fmt(secs))
              )
            ),
            !task.done&&e("button",{onClick:()=>isActive?stopTimer(task.id):startTimer(task.id),className:"btn-tap",style:{padding:"5px 11px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:isActive?"rgba(226,75,74,0.12)":"rgba(55,138,221,0.12)",color:isActive?"#E24B4A":"#378ADD",flexShrink:0}},isActive?"Stop":"Start"),
            e("button",{onClick:()=>deleteTask(task.id),className:"btn-tap",style:{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:20,lineHeight:1,padding:"0 4px",flexShrink:0}},"×")
          );
        })
      ),
      !adding?e("button",{onClick:()=>setAdding(true),className:"btn-tap",style:{display:"flex",alignItems:"center",gap:8,padding:"13px 16px",width:"100%",borderRadius:16,border:`0.5px solid ${C.border}`,background:C.card,cursor:"pointer",color:"#378ADD",fontSize:15,fontWeight:500,boxSizing:"border-box",boxShadow:dark?"0 1px 3px rgba(0,0,0,0.4)":"0 1px 3px rgba(0,0,0,0.06)"}},e("span",{style:{fontSize:20,lineHeight:1}},"+")," New task"):
      e("div",{style:{...card,padding:14},className:"card-anim"},
        e("input",{autoFocus:true,value:nt.title,onChange:ev=>setNt(p=>({...p,title:ev.target.value})),onKeyDown:ev=>ev.key==="Enter"&&addTask(),placeholder:"Task name",style:{...inp,width:"100%",marginBottom:10,fontSize:16,fontWeight:500,background:"transparent",border:"none",borderBottom:`1px solid ${C.border}`,borderRadius:0,padding:"4px 0",boxShadow:"none"}}),
        e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}},
          e("input",{type:"date",value:nt.dueDate,onChange:ev=>setNt(p=>({...p,dueDate:ev.target.value})),style:{...inp,fontSize:13,flex:1,minWidth:120}}),
          e("select",{value:nt.priority,onChange:ev=>setNt(p=>({...p,priority:ev.target.value})),style:{...inp,fontSize:13}},...PRIORITIES.map(p=>e("option",{key:p},p))),
          e("select",{value:nt.subject,onChange:ev=>setNt(p=>({...p,subject:ev.target.value})),style:{...inp,fontSize:13}},e("option",{value:""},"No subject"),...subjects.map(s=>e("option",{key:s.id},s.name))),
          e("div",{style:{display:"flex",gap:8,width:"100%",marginTop:4}},
            e("button",{onClick:()=>{setAdding(false);setNt({title:"",dueDate:"",priority:"Medium",subject:""});},className:"btn-tap",style:{...ghostBtn,flex:1}},"Cancel"),
            e("button",{onClick:addTask,className:"btn-tap",style:{...blueBtn,flex:1}},"Add")
          )
        )
      ),
      e("div",{style:{marginTop:20}},
        e("div",{style:st},"Subjects"),
        e("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:8}},
          ...subjects.map(s=>e("span",{key:s.id,style:{fontSize:12,fontWeight:600,color:s.color,background:s.color+"18",borderRadius:8,padding:"5px 12px",display:"flex",alignItems:"center",gap:6}},
            s.name,e("span",{onClick:()=>setSubjects(p=>p.filter(x=>x.id!==s.id)),className:"btn-tap",style:{cursor:"pointer",opacity:0.5,fontSize:15,lineHeight:1}},"×")
          )),
          !addingS&&e("button",{onClick:()=>setAddingS(true),className:"btn-tap",style:{fontSize:12,fontWeight:600,color:"#378ADD",background:"rgba(55,138,221,0.10)",borderRadius:8,padding:"5px 12px",border:"none",cursor:"pointer"}},"+ Add subject")
        ),
        addingS&&e("div",{style:{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"},className:"fade-up"},
          e("input",{value:ns.name,onChange:ev=>setNs(p=>({...p,name:ev.target.value})),placeholder:"Subject name",style:{...inp,flex:1},onKeyDown:ev=>ev.key==="Enter"&&addSubject()}),
          e("div",{style:{display:"flex",gap:5}},...SUBJECT_COLORS.map(c=>e("div",{key:c,onClick:()=>setNs(p=>({...p,color:c})),className:"btn-tap",style:{width:20,height:20,borderRadius:"50%",background:c,cursor:"pointer",border:ns.color===c?`2.5px solid ${C.text}`:"2.5px solid transparent",transition:"border 0.15s"}}))),
          e("button",{onClick:addSubject,className:"btn-tap",style:blueBtn},"Add"),
          e("button",{onClick:()=>setAddingS(false),className:"btn-tap",style:ghostBtn},"Cancel")
        )
      )
    ),

    // ── POMODORO ──
    view==="pomodoro"&&e("div",{style:{textAlign:"center"}},
      e("div",{style:{position:"relative",width:210,height:210,margin:"0 auto 24px"}},
        e("svg",{width:210,height:210,style:{transform:"rotate(-90deg)"}},
          e("circle",{cx:105,cy:105,r:94,fill:"none",stroke:C.bg2,strokeWidth:10}),
          e("circle",{cx:105,cy:105,r:94,fill:"none",stroke:pomoColor,strokeWidth:10,strokeLinecap:"round",strokeDasharray:`${2*Math.PI*94}`,strokeDashoffset:`${2*Math.PI*94*(1-pomoPct/100)}`,className:"ring-progress"})
        ),
        e("div",{style:{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center"}},
          e("div",{style:{display:"flex",alignItems:"flex-start",justifyContent:"center",gap:1}},
            e("span",{key:"m"+pomoMinsStr,className:"flip-num",style:{fontSize:44,fontWeight:700,letterSpacing:"-2px",color:C.text,fontVariantNumeric:"tabular-nums"}},pomoMinsStr),
            e("span",{style:{fontSize:44,fontWeight:300,color:C.text3,margin:"0 1px",lineHeight:1}}),
            e("span",{key:"s"+pomoSecsStr,className:"flip-num",style:{fontSize:44,fontWeight:700,letterSpacing:"-2px",color:C.text,fontVariantNumeric:"tabular-nums"}},":"+pomoSecsStr)
          ),
          e("div",{style:{fontSize:12,color:C.text2,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.6px",marginTop:4}},pomo.mode==="work"?"Focus":pomo.mode==="shortBreak"?"Short break":"Long break")
        )
      ),
      e("div",{style:{display:"flex",justifyContent:"center",gap:10,marginBottom:20}},
        e("button",{onClick:()=>{setPomoRunning(r=>!r);if(!pomoRunning)updateStreak();},className:"btn-tap",style:{...blueBtn,padding:"12px 36px",fontSize:16,borderRadius:14,background:pomoColor}},pomoRunning?"Pause":"Start"),
        e("button",{onClick:()=>{setPomoRunning(false);setPomoSecs(pomo.mode==="work"?pomo.work*60:pomo.mode==="shortBreak"?pomo.shortBreak*60:pomo.longBreak*60);},className:"btn-tap",style:{...ghostBtn,padding:"12px 20px",fontSize:16,borderRadius:14}},"Reset")
      ),
      e("div",{style:{display:"flex",justifyContent:"center",gap:8,marginBottom:20}},
        ...["work","shortBreak","longBreak"].map(m=>e("button",{key:m,onClick:()=>{setPomoRunning(false);setPomo(p=>({...p,mode:m}));setPomoSecs(m==="work"?pomo.work*60:m==="shortBreak"?pomo.shortBreak*60:pomo.longBreak*60);},className:"btn-tap tab-transition",style:{padding:"6px 14px",borderRadius:10,border:`1px solid ${C.border}`,background:pomo.mode===m?C.bg2:"transparent",color:pomo.mode===m?C.text:C.text2,fontSize:13,cursor:"pointer",fontWeight:pomo.mode===m?600:400}},m==="work"?"Focus":m==="shortBreak"?"Short":"Long"))
      ),
      e("div",{style:{...card,padding:"16px",textAlign:"left"}},
        e("div",{style:st},"Timer settings"),
        ...[["work","Focus (min)"],["shortBreak","Short break"],["longBreak","Long break"]].map(([k,l])=>
          e("div",{key:k,style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}},
            e("span",{style:{fontSize:15,color:C.text2}},l),
            e("div",{style:{display:"flex",alignItems:"center",gap:12}},
              e("button",{onClick:()=>setPomo(p=>({...p,[k]:Math.max(1,p[k]-1)})),className:"btn-tap",style:{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:C.bg2,color:C.text,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}},"−"),
              e("span",{style:{fontSize:16,fontWeight:600,minWidth:28,textAlign:"center",color:C.text}},pomo[k]),
              e("button",{onClick:()=>setPomo(p=>({...p,[k]:p[k]+1})),className:"btn-tap",style:{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:C.bg2,color:C.text,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}},"+")
            )
          )
        ),
        e("div",{style:{fontSize:13,color:C.text3}},"Sessions completed: "+pomo.count)
      )
    ),

    // ── GRADES ──
    view==="grades"&&e("div",null,
      e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}},
        e("div",{style:{background:"rgba(155,89,182,0.10)",borderRadius:14,padding:"14px 16px"}},e("div",{style:{fontSize:11,fontWeight:600,color:"#9B59B6",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}},"Average"),e("div",{style:{fontSize:30,fontWeight:700,color:"#9B59B6",letterSpacing:"-1px"}},avgGrade()?`${avgGrade()}%`:"—")),
        e("div",{style:{background:"rgba(55,138,221,0.10)",borderRadius:14,padding:"14px 16px"}},e("div",{style:{fontSize:11,fontWeight:600,color:"#378ADD",textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}},"Assignments"),e("div",{style:{fontSize:30,fontWeight:700,color:"#378ADD",letterSpacing:"-1px"}},grades.length))
      ),
      subjects.length===0&&e("div",{style:{color:C.text3,fontSize:14,marginBottom:10,padding:"12px 0"}},"Add subjects in the Tasks tab first."),
      ...subjects.map(sub=>{
        const sg=grades.filter(g=>g.subject===sub.name);if(!sg.length)return null;
        const avg=(sg.reduce((a,g)=>a+(g.score/g.total*100),0)/sg.length).toFixed(1);
        return e("div",{key:sub.id,style:card},
          e("div",{style:{padding:"12px 16px",borderBottom:`0.5px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center",background:C.card}},
            e("span",{style:{fontSize:14,fontWeight:600,color:sub.color}},sub.name),
            e("span",{style:{fontSize:14,fontWeight:700,color:sub.color}},avg+"%")
          ),
          ...sg.map((g,i)=>e("div",{key:g.id,style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:i<sg.length-1?`0.5px solid ${C.border}`:"none",background:C.card}},
            e("span",{style:{fontSize:14,color:C.text}},g.assignment),
            e("div",{style:{display:"flex",alignItems:"center",gap:10}},
              e("span",{style:{fontSize:14,fontWeight:600,color:(g.score/g.total*100)>=70?"#639922":(g.score/g.total*100)>=50?"#EF9F27":"#E24B4A"}},(g.score/g.total*100).toFixed(0)+"%"),
              e("span",{style:{fontSize:12,color:C.text3}},g.score+"/"+g.total),
              e("button",{onClick:()=>setGrades(p=>p.filter(x=>x.id!==g.id)),className:"btn-tap",style:{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:18,lineHeight:1}},"×")
            )
          ))
        );
      }),
      !addingG?e("button",{onClick:()=>setAddingG(true),className:"btn-tap",style:{display:"flex",alignItems:"center",gap:8,padding:"13px 16px",width:"100%",borderRadius:16,border:`0.5px solid ${C.border}`,background:C.card,cursor:"pointer",color:"#9B59B6",fontSize:15,fontWeight:500,boxSizing:"border-box",boxShadow:dark?"0 1px 3px rgba(0,0,0,0.4)":"0 1px 3px rgba(0,0,0,0.06)"}},e("span",{style:{fontSize:20}},"+")," Log a grade"):
      e("div",{style:{...card,padding:14},className:"card-anim"},
        e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}},
          e("select",{value:ng.subject,onChange:ev=>setNg(p=>({...p,subject:ev.target.value})),style:{...inp,width:"100%"}},e("option",{value:""},"Subject"),...subjects.map(s=>e("option",{key:s.id},s.name))),
          e("input",{value:ng.assignment,onChange:ev=>setNg(p=>({...p,assignment:ev.target.value})),placeholder:"Assignment name",style:{...inp,width:"100%"}}),
          e("input",{type:"number",value:ng.score,onChange:ev=>setNg(p=>({...p,score:ev.target.value})),placeholder:"Score",style:{...inp,width:"100%"}}),
          e("input",{type:"number",value:ng.total,onChange:ev=>setNg(p=>({...p,total:ev.target.value})),placeholder:"Out of",style:{...inp,width:"100%"}})
        ),
        e("div",{style:{display:"flex",gap:8}},
          e("button",{onClick:()=>setAddingG(false),className:"btn-tap",style:{...ghostBtn,flex:1}},"Cancel"),
          e("button",{onClick:addGrade,className:"btn-tap",style:{...blueBtn,flex:1,background:"#9B59B6"}},"Save")
        )
      )
    ),

    // ── EXAMS ──
    view==="exams"&&e("div",null,
      upcomingExams.length===0&&e("div",{style:{...card,padding:"1.5rem",textAlign:"center",color:C.text3,fontSize:14}},"No upcoming exams · add one below"),
      ...upcomingExams.map(exam=>{
        const days=daysUntil(exam.date),col=days<=3?"#E24B4A":days<=7?"#EF9F27":"#378ADD",sc=exam.subject?subjectColor(exam.subject):col;
        return e("div",{key:exam.id,style:{...card,marginBottom:10},className:"fade-up"},
          e("div",{style:{padding:"14px 16px",background:C.card}},
            e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}},
              e("div",{style:{flex:1,minWidth:0}},
                exam.subject&&e("span",{style:{fontSize:11,fontWeight:600,color:sc,background:sc+"18",borderRadius:6,padding:"2px 8px",marginBottom:6,display:"inline-block"}},exam.subject),
                e("div",{style:{fontSize:16,fontWeight:600,color:C.text,marginTop:exam.subject?5:0}},exam.title),
                e("div",{style:{fontSize:13,color:C.text2,marginTop:3}},new Date(exam.date).toLocaleDateString("en-AU",{weekday:"long",month:"long",day:"numeric"})),
                exam.notes&&e("div",{style:{fontSize:13,color:C.text3,marginTop:4}},exam.notes)
              ),
              e("div",{style:{textAlign:"right",flexShrink:0,marginLeft:16}},
                e("div",{style:{fontSize:24,fontWeight:700,color:col,letterSpacing:"-0.5px"}},days===0?"Today":days===1?"Tmrw":`${days}d`),
                e("div",{style:{fontSize:11,color:C.text3}},"until exam"),
                e("button",{onClick:()=>setExams(p=>p.filter(x=>x.id!==exam.id)),className:"btn-tap",style:{background:"none",border:"none",cursor:"pointer",color:C.text3,fontSize:18,marginTop:6,display:"block",marginLeft:"auto"}},"×")
              )
            ),
            e("div",{style:{marginTop:12,height:4,background:C.bg2,borderRadius:4,overflow:"hidden"}},
              e("div",{className:"progress-bar",style:{height:"100%",background:col,borderRadius:4,width:`${Math.max(4,100-Math.min(100,(days/30)*100))}%`}})
            )
          )
        );
      }),
      !addingX?e("button",{onClick:()=>setAddingX(true),className:"btn-tap",style:{display:"flex",alignItems:"center",gap:8,padding:"13px 16px",width:"100%",borderRadius:16,border:`0.5px solid ${C.border}`,background:C.card,cursor:"pointer",color:"#E24B4A",fontSize:15,fontWeight:500,boxSizing:"border-box",boxShadow:dark?"0 1px 3px rgba(0,0,0,0.4)":"0 1px 3px rgba(0,0,0,0.06)"}},e("span",{style:{fontSize:20}},"+")," Add exam / deadline"):
      e("div",{style:{...card,padding:14},className:"card-anim"},
        e("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}},
          e("input",{value:nx.title,onChange:ev=>setNx(p=>({...p,title:ev.target.value})),placeholder:"Exam / deadline title",style:{...inp,width:"100%",gridColumn:"1/-1"}}),
          e("select",{value:nx.subject,onChange:ev=>setNx(p=>({...p,subject:ev.target.value})),style:{...inp,width:"100%"}},e("option",{value:""},"Subject (optional)"),...subjects.map(s=>e("option",{key:s.id},s.name))),
          e("input",{type:"date",value:nx.date,onChange:ev=>setNx(p=>({...p,date:ev.target.value})),style:{...inp,width:"100%"}}),
          e("input",{value:nx.notes,onChange:ev=>setNx(p=>({...p,notes:ev.target.value})),placeholder:"Notes (optional)",style:{...inp,width:"100%",gridColumn:"1/-1"}})
        ),
        e("div",{style:{display:"flex",gap:8}},
          e("button",{onClick:()=>setAddingX(false),className:"btn-tap",style:{...ghostBtn,flex:1}},"Cancel"),
          e("button",{onClick:addExam,className:"btn-tap",style:{...blueBtn,flex:1,background:"#E24B4A"}},"Save")
        )
      )
    ),

    // ── STREAK ──
    view==="streak"&&e("div",null,
      e("div",{style:{...card,padding:"20px",textAlign:"center",marginBottom:12}},
        e("div",{style:{fontSize:56,fontWeight:700,color:"#E24B4A",letterSpacing:"-3px",lineHeight:1}},(streak.days===0?"🌱":streak.days<7?"🔥":streak.days<30?"⚡":"👑")+" "+streak.days),
        e("div",{style:{fontSize:15,color:C.text2,fontWeight:500,marginTop:6}},"day streak"),
        e("div",{style:{fontSize:13,color:C.text3,marginTop:4}},streak.lastStudied===todayKey()?"Studied today ✓":"Study today to keep your streak!")
      ),
      e("div",{style:{...card,padding:"16px",marginBottom:12}},
        e("div",{style:st},"Today's goal"),
        e("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}},
          e("span",{key:tick,style:{fontSize:14,color:C.text2}},fmt(streak.todaySecs)+" studied"),
          e("span",{style:{fontSize:14,fontWeight:700,color:goalPct>=100?"#639922":"#378ADD"}},goalPct+"%")
        ),
        e("div",{style:{height:8,background:C.bg2,borderRadius:6,overflow:"hidden"}},
          e("div",{className:"progress-bar",style:{height:"100%",background:goalPct>=100?"#639922":"#378ADD",borderRadius:6,width:`${goalPct}%`}})
        ),
        e("div",{style:{fontSize:13,color:C.text3,marginTop:8}},"Goal: "+streak.goal+" min/day"),
        e("div",{style:{display:"flex",alignItems:"center",gap:10,marginTop:14}},
          e("span",{style:{fontSize:14,color:C.text2}},"Daily goal (min)"),
          e("div",{style:{display:"flex",alignItems:"center",gap:10,marginLeft:"auto"}},
            e("button",{onClick:()=>setStreak(s=>({...s,goal:Math.max(5,s.goal-5)})),className:"btn-tap",style:{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:C.bg2,color:C.text,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}},"−"),
            e("span",{style:{fontSize:15,fontWeight:600,minWidth:32,textAlign:"center",color:C.text}},streak.goal),
            e("button",{onClick:()=>setStreak(s=>({...s,goal:s.goal+5})),className:"btn-tap",style:{width:32,height:32,borderRadius:8,border:`1px solid ${C.border}`,background:C.bg2,color:C.text,fontSize:18,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}},"+")
          )
        )
      ),
      e("div",{style:{...card,padding:"16px"}},
        e("div",{style:st},"Stats"),
        ...[{l:"Total study time",v:fmt(tasks.reduce((a,t)=>a+t.loggedSeconds,0)+streak.todaySecs)},
            {l:"Tasks completed",v:tasks.filter(t=>t.done).length},
            {l:"Pomodoro sessions",v:pomo.count},
            {l:"Grades logged",v:grades.length},
            {l:"Upcoming exams",v:upcomingExams.length},
           ].map((r,i,arr)=>e("div",{key:r.l,style:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:i<arr.length-1?`0.5px solid ${C.border}`:"none"}},
             e("span",{style:{fontSize:15,color:C.text2}},r.l),
             e("span",{key:tick,style:{fontSize:15,fontWeight:600,color:C.text}},r.v)
           ))
      )
    )
  ));
}

ReactDOM.createRoot(document.getElementById("root")).render(e(App));
