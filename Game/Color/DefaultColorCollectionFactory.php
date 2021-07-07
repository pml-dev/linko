<?php

/**
 * Description of DefaultColorCollectionFactory
 *
 * @author Mr_Kywar mr_kywar@gmail.com
 */
abstract class DefaultColorCollectionFactory {
    
    public static function create(): ColorCollection {
        $collect = new ColorCollection();
        
        $collect->addColor(new Color("ff0000","red"))
                ->addColor(new Color("48ff00","light green"))
                ->addColor(new Color("0000ff","blue"))
                ->addColor(new Color("ffa500","orange"))
                ->addColor(new Color("773300","brown"))
                ->addColor(new Color("ff619e","pink"))
                ->addColor(new Color("f761ff","magenta"))
                ->addColor(new Color("9900ff","purple"))
                ->addColor(new Color("000000","black"))
                ->addColor(new Color("ffffff","white"))
                ->addColor(new Color("ffff00","yellow"))
        ;
        
        return $collect;
        
    }
}
