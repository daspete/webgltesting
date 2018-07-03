class Pointer {
    constructor(settings){
        if(settings){
            this.id = -1;
            this.x = settings.x;
            this.y = settings.y;
            this.dx = settings.dx;
            this.dy = settings.dy;
            this.down = true;
            this.moved = true;
            this.color = settings.color;
        }else{
            this.id = -1;
            this.x = 256;
            this.y = 256;
            this.dx = 10;
            this.dy = 0;
            this.down = true;
            this.moved = true;
            this.color = [30, 0, 300];
        }
        
    }
}

export default Pointer;